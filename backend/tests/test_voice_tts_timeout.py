import asyncio
import pytest
from fastapi.testclient import TestClient
from app.seed.seed_data import seed_database
from app.services.providers.factory import provider_registry
from app.services.providers.speech_provider import MockSpeechProvider, TranscriptionResult


class SlowMockSpeechProvider(MockSpeechProvider):
    """Mock speech provider that simulates a slow TTS call exceeding 2.0s timeout."""

    async def text_to_speech(
        self,
        text: str,
        language_code: str | None = None
    ) -> str | None:
        # Sleep for 2.5 seconds to trigger asyncio.wait_for timeout=2.0
        await asyncio.sleep(2.5)
        return "slow_audio_base64"


class FastMockSpeechProvider(MockSpeechProvider):
    """Mock speech provider that returns audio immediately."""

    async def text_to_speech(
        self,
        text: str,
        language_code: str | None = None
    ) -> str | None:
        return "quick_valid_audio_base64"


class FailingMockSpeechProvider(MockSpeechProvider):
    """Mock speech provider that raises an exception during TTS."""

    async def text_to_speech(
        self,
        text: str,
        language_code: str | None = None
    ) -> str | None:
        raise RuntimeError("Sarvam TTS connection timed out or unavailable")


def test_voice_tts_timeout_fallback_to_text(client: TestClient, db, monkeypatch):
    """
    Verify Fix 5: When TTS synthesis takes longer than 2.0 seconds,
    asyncio.wait_for gracefully catches the timeout, sets audio_base64 = None,
    and returns HTTP 200 with the full text question preserved for browser TTS fallback.
    """
    seed_database(db)

    # Inject slow speech provider
    slow_provider = SlowMockSpeechProvider()
    monkeypatch.setattr(provider_registry, "_speech_provider", slow_provider)
    from app.services.providers import factory
    monkeypatch.setattr(factory, "get_speech_service", lambda: slow_provider)

    res = client.post("/api/v1/intakes", json={
        "patient_name": "Slow TTS Patient",
        "patient_age": 35,
        "language_code": "hi",
        "interaction_mode": "VOICE"
    })
    assert res.status_code == 200
    session_id = res.json()["id"]

    fake_wav_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"

    response = client.post(
        f"/api/v1/intakes/{session_id}/voice-answer",
        files={"file": ("speech.wav", fake_wav_bytes, "audio/wav")},
        data={"language_code": "hi"}
    )
    assert response.status_code == 200
    data = response.json()

    # Audio synthesis timed out gracefully
    assert data["audio_base64"] is None
    # Text decision question is still intact and available for browser Web Speech synthesis
    assert data["decision"]["question"] is not None
    assert len(data["decision"]["question"]) > 0
    assert data["transcript_text"] is not None


def test_voice_tts_fast_success(client: TestClient, db, monkeypatch):
    """
    Verify that when TTS synthesis succeeds within 2.0 seconds,
    audio_base64 is returned intact in the response.
    """
    seed_database(db)

    fast_provider = FastMockSpeechProvider()
    monkeypatch.setattr(provider_registry, "_speech_provider", fast_provider)
    from app.services.providers import factory
    monkeypatch.setattr(factory, "get_speech_service", lambda: fast_provider)

    res = client.post("/api/v1/intakes", json={
        "patient_name": "Fast TTS Patient",
        "patient_age": 28,
        "language_code": "hi",
        "interaction_mode": "VOICE"
    })
    assert res.status_code == 200
    session_id = res.json()["id"]

    fake_wav_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"

    response = client.post(
        f"/api/v1/intakes/{session_id}/voice-answer",
        files={"file": ("speech.wav", fake_wav_bytes, "audio/wav")},
        data={"language_code": "hi"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["audio_base64"] == "quick_valid_audio_base64"
    assert data["decision"]["question"] is not None


def test_voice_tts_exception_fallback(client: TestClient, db, monkeypatch):
    """
    Verify that if the speech provider throws an unexpected error,
    it is caught without aborting the intake flow, returning audio_base64 = None.
    """
    seed_database(db)

    failing_provider = FailingMockSpeechProvider()
    monkeypatch.setattr(provider_registry, "_speech_provider", failing_provider)
    from app.services.providers import factory
    monkeypatch.setattr(factory, "get_speech_service", lambda: failing_provider)

    res = client.post("/api/v1/intakes", json={
        "patient_name": "Error TTS Patient",
        "patient_age": 50,
        "language_code": "hi",
        "interaction_mode": "VOICE"
    })
    assert res.status_code == 200
    session_id = res.json()["id"]

    fake_wav_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"

    response = client.post(
        f"/api/v1/intakes/{session_id}/voice-answer",
        files={"file": ("speech.wav", fake_wav_bytes, "audio/wav")},
        data={"language_code": "hi"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["audio_base64"] is None
    assert data["decision"]["question"] is not None
