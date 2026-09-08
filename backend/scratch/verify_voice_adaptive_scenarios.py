"""
Verification of Scenarios A through F for SwasthyaVaani Voice/Adaptive integration.
"""
import sys
sys.path.insert(0, ".")
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')
import io
import wave
import json
from fastapi.testclient import TestClient
from app.main import app
import base64
import asyncio
from app.core.config import settings
from app.services.providers.base import TranscriptionResult
from app.services.providers import factory
from app.services.providers.speech_provider import MockSpeechProvider, SarvamSpeechProvider, SpeechProviderError

def create_fake_wav() -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(b'\x00\x00' * 1600)
    return buf.getvalue()

def run_scenarios():
    client = TestClient(app)
    fake_wav = create_fake_wav()
    results = {}

    print("=== [TEST A: VOICE GI INTAKE] ===")
    res = client.post("/api/v1/intakes", json={
        "patient_name": "Ramesh Kumar",
        "patient_age": 42,
        "language_code": "hi",
        "interaction_mode": "VOICE"
    })
    assert res.status_code == 200, f"Failed intake creation: {res.text}"
    intake_id = res.json()["id"]

    audio_to_send = fake_wav

    # If Sarvam ASR is not using audio or returns empty, register RealMockProvider
    class RealisticSpeechProvider(MockSpeechProvider):
        async def transcribe_audio(self, audio_bytes, language_code=None):
            return TranscriptionResult(
                transcript_text="मुझे पेट में दर्द हो रहा है",
                detected_language="hi",
                confidence=0.98,
                provider_name="Sarvam AI Saaras (Simulated)"
            )

    # If audio is empty or test is offline, use realistic provider for reproducible testing
    factory.provider_registry.override_speech(RealisticSpeechProvider())

    res_ans1 = client.post(
        f"/api/v1/intakes/{intake_id}/voice-answer",
        files={"file": ("voice.wav", audio_to_send, "audio/wav")},
        data={"language_code": "hi"}
    )
    assert res_ans1.status_code == 200, f"Answer 1 failed: {res_ans1.text}"
    ans1_data = res_ans1.json()
    print(f"Turn 1 Transcript: {ans1_data['transcript_text']}")
    print(f"Turn 1 Next Question: {ans1_data['decision']['question']}")
    print(f"Turn 1 Target Field: {ans1_data['decision']['target_field']}")
    print(f"Turn 1 Action: {ans1_data['decision']['action']}")
    assert ans1_data["decision"]["target_field"] is not None
    q1_event_id = ans1_data["next_question_event_id"]

    results["test_a"] = {
        "status": "PASSED",
        "intake_id": intake_id,
        "transcript": ans1_data["transcript_text"],
        "next_q": ans1_data["decision"]["question"],
        "target_field": ans1_data["decision"]["target_field"]
    }

    print("\n=== [TEST B: VOICE LEARNING - VOLUNTEERED VOMITING] ===")
    res_ans2 = client.post(
        f"/api/v1/intakes/{intake_id}/answers",
        json={
            "raw_text": "मुझे उल्टी भी हो रही है, 2 दिन से",
            "input_mode": "VOICE",
            "language_code": "hi",
            "question_event_id": q1_event_id
        }
    )
    assert res_ans2.status_code == 200, f"Answer 2 failed: {res_ans2.text}"
    ans2_data = res_ans2.json()
    state2 = ans2_data["clinical_state"]
    print(f"Canonical Vomiting: {state2.get('canonical_dimensions', {}).get('vomiting', {}).get('status')}")
    print(f"Duration: {state2.get('duration')}")
    print(f"Next Target Field: {ans2_data['decision']['target_field']}")
    print(f"Next Question: {ans2_data['decision']['question']}")
    assert state2.get("canonical_dimensions", {}).get("vomiting", {}).get("status") == "KNOWN_TRUE"
    assert ans2_data["decision"]["target_field"] != "vomiting"

    results["test_b"] = {
        "status": "PASSED",
        "vomiting_status": state2.get("canonical_dimensions", {}).get("vomiting", {}).get("status"),
        "duration": state2.get("duration"),
        "next_field": ans2_data["decision"]["target_field"]
    }

    print("\n=== [TEST C: VOICE NEGATION - MARATHI & HINDI] ===")
    res_mr = client.post("/api/v1/intakes", json={
        "patient_name": "Sanjay Patil",
        "patient_age": 38,
        "language_code": "mr",
        "interaction_mode": "VOICE"
    })
    mr_id = res_mr.json()["id"]

    res_mr_ans1 = client.post(
        f"/api/v1/intakes/{mr_id}/answers",
        json={
            "raw_text": "माझ्या पोटात दुखत आहे",
            "input_mode": "VOICE",
            "language_code": "mr"
        }
    )
    assert res_mr_ans1.status_code == 200
    mr_q1_id = res_mr_ans1.json()["next_question_event_id"]

    res_mr_ans2 = client.post(
        f"/api/v1/intakes/{mr_id}/answers",
        json={
            "raw_text": "मला उलटी होत नाही",
            "input_mode": "VOICE",
            "language_code": "mr",
            "question_event_id": mr_q1_id
        }
    )
    assert res_mr_ans2.status_code == 200
    mr_ans2_data = res_mr_ans2.json()
    mr_state = mr_ans2_data["clinical_state"]
    vomit_dim = mr_state.get("canonical_dimensions", {}).get("vomiting", {})
    print(f"Marathi Negation Dim Status: {vomit_dim.get('status')}")
    print(f"Marathi Negated Symptoms: {mr_state.get('negated_symptoms')}")
    assert vomit_dim.get("status") == "KNOWN_FALSE", f"Expected KNOWN_FALSE, got {vomit_dim.get('status')}"
    assert "vomiting" in mr_state.get("negated_symptoms", [])

    results["test_c"] = {
        "status": "PASSED",
        "marathi_vomiting_status": vomit_dim.get("status"),
        "negated_symptoms": mr_state.get("negated_symptoms")
    }

    print("\n=== [TEST D: VOICE ASR ERROR HANDLING] ===")
    failing_sarvam = SarvamSpeechProvider(api_key="invalid_quota_exceeded_key")

    error_raised = False
    try:
        asyncio.run(failing_sarvam.transcribe_audio(fake_wav, "hi"))
    except SpeechProviderError as spe:
        error_raised = True
        print(f"Successfully caught SpeechProviderError: {spe}")

    assert error_raised, "SarvamSpeechProvider must raise SpeechProviderError on failure!"

    factory.provider_registry.override_speech(failing_sarvam)
    try:
        err_res = client.post(
            f"/api/v1/intakes/{intake_id}/voice-answer",
            files={"file": ("voice.wav", fake_wav, "audio/wav")},
            data={"language_code": "hi"}
        )
        print(f"Endpoint status code: {err_res.status_code}")
        print(f"Endpoint detail: {err_res.text}")
        assert err_res.status_code == 502
        assert "Speech transcription service unavailable" in err_res.text
    finally:
        factory.provider_registry.override_speech(MockSpeechProvider())

    results["test_d"] = {
        "status": "PASSED",
        "error_raised": True,
        "endpoint_status": 502,
        "no_fake_transcript": True
    }

    print("\n=== [TEST E: VOICE <-> TEXT MODALITY SWITCHING] ===")
    res_mod = client.post("/api/v1/intakes", json={
        "patient_name": "Pooja Deshmukh",
        "patient_age": 28,
        "language_code": "en",
        "interaction_mode": "VOICE"
    })
    mod_id = res_mod.json()["id"]

    ans1 = client.post(f"/api/v1/intakes/{mod_id}/answers", json={
        "raw_text": "I have severe abdominal cramps",
        "input_mode": "VOICE",
        "language_code": "en"
    }).json()

    ans2 = client.post(f"/api/v1/intakes/{mod_id}/answers", json={
        "raw_text": "It started 2 days ago",
        "input_mode": "TEXT",
        "language_code": "en",
        "question_event_id": ans1["next_question_event_id"]
    }).json()

    ans3 = client.post(f"/api/v1/intakes/{mod_id}/answers", json={
        "raw_text": "No vomiting and no fever",
        "input_mode": "VOICE",
        "language_code": "en",
        "question_event_id": ans2["next_question_event_id"]
    }).json()

    mod_state = ans3["clinical_state"]
    print(f"Modality Test Session: {mod_id}")
    print(f"Chief Complaint: {mod_state.get('chief_complaint')}")
    print(f"Duration: {mod_state.get('duration')}")
    print(f"Negated Symptoms: {mod_state.get('negated_symptoms')}")
    assert mod_state.get("chief_complaint") is not None
    assert mod_state.get("duration") is not None
    assert "vomiting" in mod_state.get("negated_symptoms", [])

    results["test_e"] = {
        "status": "PASSED",
        "session_id": mod_id,
        "turns": 3,
        "accumulated_correctly": True
    }

    print("\n=== [TEST F: SESSION BOUNDARY & ISOLATION] ===")
    res_leg = client.post("/api/v1/intakes", json={
        "patient_name": "Kavita Rao",
        "patient_age": 55,
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    leg_id = res_leg.json()["id"]
    assert leg_id != mod_id

    leg_ans = client.post(f"/api/v1/intakes/{leg_id}/answers", json={
        "raw_text": "I have severe pain in my right knee joint",
        "input_mode": "TEXT",
        "language_code": "en"
    }).json()

    leg_state = leg_ans["clinical_state"]
    print(f"New Session ID: {leg_id}")
    print(f"Chief Complaint: {leg_state.get('chief_complaint')}")
    print(f"Location: {leg_state.get('location')}")
    print(f"Candidate Target Field: {leg_ans['decision']['target_field']}")
    assert "knee" in leg_state.get("chief_complaint", "").lower() or "knee" in leg_state.get("location", "").lower()
    assert "chest" not in leg_state.get("chief_complaint", "").lower()
    assert "chest" not in str(leg_ans["decision"]["question"]).lower()

    results["test_f"] = {
        "status": "PASSED",
        "new_session_id": leg_id,
        "isolated": True,
        "zero_cardiac_leakage": True
    }

    print("\n=======================================================")
    print("ALL SCENARIOS A - F PASSED SUCCESSFULLY!")
    print("=======================================================")
    with open("scratch/voice_adaptive_scenario_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_scenarios()
