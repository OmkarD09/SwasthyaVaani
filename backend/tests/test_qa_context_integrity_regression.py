import httpx
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.schemas.clinical_state import ClinicalState
from app.seed.seed_data import seed_database
from app.services.clinical_ai.domain_classifier import classify_clinical_domains
from app.services.providers.speech_provider import SarvamSpeechProvider


@pytest.mark.asyncio
async def test_sarvam_asr_model_contract():
    """Verify SarvamSpeechProvider sends model='saaras:v3' and correct headers."""
    provider = SarvamSpeechProvider(api_key="mock_sarvam_api_key")

    captured_data = {}
    captured_headers = {}

    async def mock_post(url, headers=None, files=None, data=None):
        nonlocal captured_data, captured_headers
        captured_data = data
        captured_headers = headers
        return httpx.Response(
            status_code=200,
            json={"transcript": "मुझे पेट में दर्द है", "language_code": "hi-IN"}
        )

    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=mock_post)):
        res = await provider.transcribe_audio(b"fake_wav_audio", language_code="hi")
        assert res.transcript_text == "मुझे पेट में दर्द है"
        assert res.detected_language == "hi-IN"
        assert res.provider_name == "Sarvam AI Saaras"
        assert captured_data["model"] == "saaras:v3"
        assert captured_data["language_code"] == "hi-IN"
        assert captured_headers.get("api-subscription-key") == "mock_sarvam_api_key"


@pytest.mark.asyncio
async def test_voice_transcript_integrity_mocked_sarvam():
    """Verify that when Sarvam succeeds, the exact transcript is returned, not generic fallback."""
    provider = SarvamSpeechProvider(api_key="valid_key")

    async def mock_success(url, headers=None, files=None, data=None):
        return httpx.Response(
            status_code=200,
            json={"transcript": "I have stomach cramps", "language_code": "en-IN"}
        )

    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=mock_success)):
        res = await provider.transcribe_audio(b"audio_bytes", language_code="en")
        assert res.transcript_text == "I have stomach cramps"
        assert "chest pain" not in res.transcript_text.lower()
        assert res.provider_name == "Sarvam AI Saaras"


@pytest.mark.asyncio
async def test_voice_transcript_integrity_fallback_on_sarvam_failure(caplog):
    """Verify that when Sarvam fails (e.g. 400), it logs warning and falls back safely."""
    provider = SarvamSpeechProvider(api_key="valid_key")

    async def mock_failure(url, headers=None, files=None, data=None):
        return httpx.Response(
            status_code=400,
            text='{"error": "Invalid model"}'
        )

    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=mock_failure)):
        res = await provider.transcribe_audio(b"audio_bytes", language_code="en")
        # Falls back to MockSpeechProvider
        assert res.provider_name == "MockSpeechProvider"
        assert any("Sarvam ASR call failed with status 400" in record.message for record in caplog.records)


def test_clinical_isolation_stomach_cramps(client: TestClient, db):
    """Fresh session with 'I have stomach cramps' must NOT produce a chest-pain question."""
    seed_database(db)

    res = client.post("/api/v1/intakes", json={
        "patient_name": "Stomach Patient",
        "patient_age": 35,
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert res.status_code == 200
    session_id = res.json()["id"]

    ans = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "I have stomach cramps",
        "input_mode": "TEXT",
        "language_code": "en"
    })
    assert ans.status_code == 200
    data = ans.json()

    question_text = data["decision"]["question"] or ""
    target_field = data["decision"]["target_field"]
    state = ClinicalState(**data["clinical_state"])
    domains = classify_clinical_domains(state)

    assert "GASTROINTESTINAL" in domains
    assert "chest" not in question_text.lower()
    assert "sweating" not in question_text.lower()
    assert "clammy" not in question_text.lower()
    assert target_field in ["open_gi_exploration", "character", "onset", "duration", "location", "nausea", "vomiting"]


def test_clinical_isolation_leg_pain(client: TestClient, db):
    """Fresh session with 'I have leg pain' must NOT produce a chest-pain question."""
    seed_database(db)

    res = client.post("/api/v1/intakes", json={
        "patient_name": "Leg Patient",
        "patient_age": 40,
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert res.status_code == 200
    session_id = res.json()["id"]

    ans = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "I have leg pain",
        "input_mode": "TEXT",
        "language_code": "en"
    })
    assert ans.status_code == 200
    data = ans.json()

    question_text = data["decision"]["question"] or ""
    target_field = data["decision"]["target_field"]
    state = ClinicalState(**data["clinical_state"])
    domains = classify_clinical_domains(state)

    assert any(d in ["MUSCULOSKELETAL", "GENERAL"] for d in domains)
    assert "chest" not in question_text.lower()
    assert "sweating" not in question_text.lower()
    assert "clammy" not in question_text.lower()
    assert target_field in ["open_general_exploration", "onset", "severity", "duration", "location", "character"]


def test_clinical_isolation_chest_pain_allowed(client: TestClient, db):
    """Fresh session with 'I have severe chest pain' MAY produce chest-pain safety questions."""
    seed_database(db)

    res = client.post("/api/v1/intakes", json={
        "patient_name": "Chest Patient",
        "patient_age": 55,
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert res.status_code == 200
    session_id = res.json()["id"]

    ans = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "I have severe chest pain and pressure in my chest",
        "input_mode": "TEXT",
        "language_code": "en"
    })
    assert ans.status_code == 200
    data = ans.json()

    state = ClinicalState(**data["clinical_state"])
    domains = classify_clinical_domains(state)
    assert "CARDIAC" in domains
    assert data["decision"]["target_field"] in ["radiation", "onset", "character", "severity", "sweating_diaphoresis", "breathlessness"]


def test_mixed_modality_session_isolation(client: TestClient, db):
    """Voice session A must not leak into a newly started Chat session B."""
    seed_database(db)

    # 1. Voice Session A: patient complains of chest pain
    res_a = client.post("/api/v1/intakes", json={
        "patient_name": "Patient Alpha",
        "patient_age": 50,
        "language_code": "en",
        "interaction_mode": "VOICE"
    })
    session_a_id = res_a.json()["id"]

    ans_a = client.post(f"/api/v1/intakes/{session_a_id}/answers", json={
        "raw_text": "I have severe crushing chest pain",
        "input_mode": "VOICE",
        "language_code": "en"
    })
    assert ans_a.status_code == 200
    state_a = ClinicalState(**ans_a.json()["clinical_state"])
    assert "CARDIAC" in classify_clinical_domains(state_a)

    # 2. Newly started Chat Session B: patient complains of leg pain
    res_b = client.post("/api/v1/intakes", json={
        "patient_name": "Patient Beta",
        "patient_age": 28,
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    session_b_id = res_b.json()["id"]
    assert session_b_id != session_a_id

    ans_b = client.post(f"/api/v1/intakes/{session_b_id}/answers", json={
        "raw_text": "I have leg pain",
        "input_mode": "TEXT",
        "language_code": "en"
    })
    assert ans_b.status_code == 200
    data_b = ans_b.json()

    # Verify Session B is isolated: NO chest pain in state or question
    state_b = ClinicalState(**data_b["clinical_state"])
    domains_b = classify_clinical_domains(state_b)
    assert any(d in ["MUSCULOSKELETAL", "GENERAL"] for d in domains_b)
    assert "chest" not in (state_b.chief_complaint or "").lower()
    question_b = data_b["decision"]["question"] or ""
    assert "chest" not in question_b.lower()
    assert "sweating" not in question_b.lower()
