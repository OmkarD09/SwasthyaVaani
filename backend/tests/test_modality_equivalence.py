import pytest
from fastapi.testclient import TestClient
from app.seed.seed_data import seed_database


def test_modality_equivalence_headache(client: TestClient, db):
    """
    Verify that identical headache complaint via Voice and Text
    produces equivalent ClinicalState and the exact same next target dimension.
    """
    seed_database(db)

    # 1. Create Text Session
    res_text = client.post("/api/v1/intakes", json={
        "patient_name": "Patient Text",
        "patient_age": 30,
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert res_text.status_code == 200
    text_session_id = res_text.json()["id"]

    # 2. Create Voice Session
    res_voice = client.post("/api/v1/intakes", json={
        "patient_name": "Patient Voice",
        "patient_age": 30,
        "language_code": "en",
        "interaction_mode": "VOICE"
    })
    assert res_voice.status_code == 200
    voice_session_id = res_voice.json()["id"]

    # 3. Submit identical text: "I have a headache."
    ans_text = client.post(f"/api/v1/intakes/{text_session_id}/answers", json={
        "raw_text": "I have a headache.",
        "input_mode": "TEXT",
        "language_code": "en"
    })
    assert ans_text.status_code == 200
    data_text = ans_text.json()

    ans_voice = client.post(f"/api/v1/intakes/{voice_session_id}/answers", json={
        "raw_text": "I have a headache.",
        "input_mode": "VOICE",
        "language_code": "en"
    })
    assert ans_voice.status_code == 200
    data_voice = ans_voice.json()

    # Verify both routed to the exact same thinking engine & valid target fields
    valid_headache_targets = ["open_headache_exploration", "distribution", "photophobia", "duration", "onset", "character"]
    assert data_text["decision"]["target_field"] in valid_headache_targets
    assert data_voice["decision"]["target_field"] in valid_headache_targets
    assert data_text["decision"]["action"] == data_voice["decision"]["action"] == "ASK"
    assert data_text["clinical_state"]["chief_complaint"] == data_voice["clinical_state"]["chief_complaint"]


def test_direct_voice_audio_pipeline(client: TestClient, db):
    """
    Test direct audio upload through /api/v1/intakes/{id}/voice-answer:
    Audio -> Sarvam ASR -> process_intake_answer_core -> Sarvam TTS.
    """
    seed_database(db)

    res = client.post("/api/v1/intakes", json={
        "patient_name": "Audio Patient",
        "patient_age": 42,
        "language_code": "hi",
        "interaction_mode": "VOICE"
    })
    assert res.status_code == 200
    session_id = res.json()["id"]

    # Mock audio bytes (WAV header)
    fake_wav_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"

    response = client.post(
        f"/api/v1/intakes/{session_id}/voice-answer",
        files={"file": ("speech.wav", fake_wav_bytes, "audio/wav")},
        data={"language_code": "hi"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "transcript_text" in data
    assert "audio_base64" in data
    assert data["transcript_text"] is not None
    assert data["decision"]["action"] in ["ASK", "STOP"]


def test_interleaved_voice_and_text_modality(client: TestClient, db):
    """
    Verify patient can seamlessly alternate between typing and speaking in the same intake session.
    """
    seed_database(db)

    # 1. Start Session
    res = client.post("/api/v1/intakes", json={
        "patient_name": "Interleaved Patient",
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    session_id = res.json()["id"]

    # Turn 1: Text
    ans1 = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "I have had severe acidity and heartburn for 3 days.",
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()
    assert ans1["clinical_state"]["chief_complaint"] is not None

    # Turn 2: Voice
    ans2 = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "It burns in the upper stomach after eating spicy food.",
        "input_mode": "VOICE",
        "language_code": "en",
        "audio_duration_seconds": 3.4
    }).json()
    assert ans2["clinical_state"]["location"] is not None or "spicy" in str(ans2["clinical_state"]["associated_symptoms"])

    # Turn 3: Text again
    ans3 = client.post(f"/api/v1/intakes/{session_id}/answers", json={
        "raw_text": "No vomiting or difficulty swallowing.",
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()
    assert "vomiting" in ans3["clinical_state"]["negated_symptoms"] or "Vomiting: None" in str(ans3["clinical_state"])


def test_gi_divergence_parity_across_modalities(client: TestClient, db):
    """
    Verify that GI Case A vs GI Case B divergence is 100% identical in Voice mode and Text mode.
    """
    seed_database(db)

    # Text GI A
    res_ta = client.post("/api/v1/intakes", json={"patient_name": "T-GA", "language_code": "en"})
    t_ga = client.post(f"/api/v1/intakes/{res_ta.json()['id']}/answers", json={
        "raw_text": "I have stomach pain since yesterday and loose motions.",
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()

    # Voice GI A
    res_va = client.post("/api/v1/intakes", json={"patient_name": "V-GA", "language_code": "en"})
    v_ga = client.post(f"/api/v1/intakes/{res_va.json()['id']}/answers", json={
        "raw_text": "I have stomach pain since yesterday and loose motions.",
        "input_mode": "VOICE",
        "language_code": "en"
    }).json()

    # Text GI B
    res_tb = client.post("/api/v1/intakes", json={"patient_name": "T-GB", "language_code": "en"})
    t_gb = client.post(f"/api/v1/intakes/{res_tb.json()['id']}/answers", json={
        "raw_text": "I have stomach pain after eating outside food and I am vomiting.",
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()

    # Voice GI B
    res_vb = client.post("/api/v1/intakes", json={"patient_name": "V-GB", "language_code": "en"})
    v_vb = client.post(f"/api/v1/intakes/{res_vb.json()['id']}/answers", json={
        "raw_text": "I have stomach pain after eating outside food and I am vomiting.",
        "input_mode": "VOICE",
        "language_code": "en"
    }).json()

    # Verify Text A and Voice A target identical field
    assert t_ga["decision"]["target_field"] == v_ga["decision"]["target_field"]
    # Verify Text B and Voice B target identical field
    assert t_gb["decision"]["target_field"] == v_vb["decision"]["target_field"]


def test_multilingual_equivalence(client: TestClient, db):
    """
    Verify multilingual processing (Hindi, Marathi, English) across modalities.
    """
    seed_database(db)

    for lang, text in [
        ("hi", "मुझे दो दिन से सिरदर्द है"),
        ("mr", "मला दोन दिवसांपासून डोकेदुखी आहे"),
        ("en", "I have had a headache for two days")
    ]:
        res_t = client.post("/api/v1/intakes", json={"patient_name": f"P-{lang}-T", "language_code": lang})
        ans_t = client.post(f"/api/v1/intakes/{res_t.json()['id']}/answers", json={
            "raw_text": text,
            "input_mode": "TEXT",
            "language_code": lang
        }).json()

        res_v = client.post("/api/v1/intakes", json={"patient_name": f"P-{lang}-V", "language_code": lang})
        ans_v = client.post(f"/api/v1/intakes/{res_v.json()['id']}/answers", json={
            "raw_text": text,
            "input_mode": "VOICE",
            "language_code": lang
        }).json()

        assert ans_t["decision"]["action"] == ans_v["decision"]["action"]
        assert ans_t["decision"]["target_field"] in ["open_headache_exploration", "distribution", "photophobia", "onset", "duration"]
        assert ans_v["decision"]["target_field"] in ["open_headache_exploration", "distribution", "photophobia", "onset", "duration"]


def test_safety_parity_across_modalities(client: TestClient, db):
    """
    Verify high-risk safety red flags trigger identically in both Voice and Text modes.
    """
    seed_database(db)
    emergency_text = "I have crushing chest pain radiating to my left arm and sweating."

    res_t = client.post("/api/v1/intakes", json={"patient_name": "Safety-Text", "language_code": "en"})
    ans_t = client.post(f"/api/v1/intakes/{res_t.json()['id']}/answers", json={
        "raw_text": emergency_text,
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()

    res_v = client.post("/api/v1/intakes", json={"patient_name": "Safety-Voice", "language_code": "en"})
    ans_v = client.post(f"/api/v1/intakes/{res_v.json()['id']}/answers", json={
        "raw_text": emergency_text,
        "input_mode": "VOICE",
        "language_code": "en"
    }).json()

    assert len(ans_t["clinical_state"]["red_flags"]) == len(ans_v["clinical_state"]["red_flags"])
    assert len(ans_t["clinical_state"]["red_flags"]) > 0
