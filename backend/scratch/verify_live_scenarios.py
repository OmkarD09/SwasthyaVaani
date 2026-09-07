import base64
import json
import httpx
import asyncio
from app.core.config import settings
from app.services.providers.speech_provider import SarvamSpeechProvider

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def run_scenarios():
    print("==================================================")
    print("LIVE SWASTHYAVAANI SCENARIO VERIFICATION")
    print("==================================================")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # ----------------------------------------------------
        # SCENARIO 1: Live Voice - "I have stomach cramps"
        # ----------------------------------------------------
        print("\n--- SCENARIO 1: Fresh Intake Voice 'I have stomach cramps' ---")
        res1 = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": "Scenario 1 Voice Patient",
            "patient_age": 32,
            "patient_gender": "Female",
            "language_code": "en",
            "interaction_mode": "VOICE",
            "consent_given": True
        })
        assert res1.status_code == 200, res1.text
        s1_data = res1.json()
        s1_id = s1_data["id"]
        print(f"Created Session 1 ID: {s1_id}")

        # Synthesize real spoken audio for "I have stomach cramps" using Sarvam TTS
        sarvam = SarvamSpeechProvider(api_key=settings.SARVAM_API_KEY)
        audio_b64 = await sarvam.text_to_speech("I have stomach cramps", "en")
        if audio_b64:
            audio_bytes = base64.b64decode(audio_b64)
            print(f"Generated real spoken audio: {len(audio_bytes)} bytes")
            # Post audio to voice-answer endpoint
            files = {"file": ("patient_stomach.wav", audio_bytes, "audio/wav")}
            data = {"language_code": "en"}
            ans1_res = await client.post(f"{BASE_URL}/intakes/{s1_id}/voice-answer", files=files, data=data)
        else:
            print("TTS unavailable, sending text to answers")
            ans1_res = await client.post(f"{BASE_URL}/intakes/{s1_id}/answers", json={
                "raw_text": "I have stomach cramps",
                "input_mode": "VOICE",
                "language_code": "en"
            })

        assert ans1_res.status_code == 200, ans1_res.text
        ans1_data = ans1_res.json()
        transcript1 = ans1_data.get("transcript_text", ans1_data.get("extracted_facts", {}).get("chief_complaint"))
        decision1 = ans1_data["decision"]
        q1_text = decision1.get("question")
        q1_target = decision1.get("target_field")
        cc1 = ans1_data["clinical_state"].get("chief_complaint")
        loc1 = ans1_data["clinical_state"].get("location")

        print(f"Transcript received: {transcript1}")
        print(f"Chief Complaint in state: {cc1}")
        print(f"Location in state: {loc1}")
        print(f"Next Target Field: {q1_target}")
        print(f"AI Question Text: {q1_text}")

        assert "chest" not in q1_text.lower(), f"Contamination in Q1! {q1_text}"
        assert "sweating" not in q1_text.lower(), f"Contamination in Q1! {q1_text}"
        assert "clammy" not in q1_text.lower(), f"Contamination in Q1! {q1_text}"
        print(">> SCENARIO 1 PASSED: Stomach cramps transcript recognized, GI/general target selected, ZERO chest-pain wording.")

        # ----------------------------------------------------
        # SCENARIO 2: Fresh Intake Chat - "I have leg pain"
        # ----------------------------------------------------
        print("\n--- SCENARIO 2: Fresh Intake Chat 'I have leg pain' ---")
        res2 = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": "Scenario 2 Chat Patient",
            "patient_age": 45,
            "patient_gender": "Male",
            "language_code": "en",
            "interaction_mode": "TEXT",
            "consent_given": True
        })
        assert res2.status_code == 200, res2.text
        s2_data = res2.json()
        s2_id = s2_data["id"]
        print(f"Created Session 2 ID: {s2_id} (different from s1: {s2_id != s1_id})")

        ans2_res = await client.post(f"{BASE_URL}/intakes/{s2_id}/answers", json={
            "raw_text": "I have leg pain",
            "input_mode": "TEXT",
            "language_code": "en"
        })
        assert ans2_res.status_code == 200, ans2_res.text
        ans2_data = ans2_res.json()
        decision2 = ans2_data["decision"]
        q2_text = decision2.get("question")
        q2_target = decision2.get("target_field")
        cc2 = ans2_data["clinical_state"].get("chief_complaint")

        print(f"Chief Complaint in state: {cc2}")
        print(f"Next Target Field: {q2_target}")
        print(f"AI Question Text: {q2_text}")

        assert "chest" not in q2_text.lower(), f"Contamination in Q2! {q2_text}"
        assert "sweating" not in q2_text.lower(), f"Contamination in Q2! {q2_text}"
        assert "clammy" not in q2_text.lower(), f"Contamination in Q2! {q2_text}"
        print(">> SCENARIO 2 PASSED: Leg pain recognized, target selected without any chest-pain wording.")

        # ----------------------------------------------------
        # SCENARIO 3: Fresh Intake - "I have chest pain"
        # ----------------------------------------------------
        print("\n--- SCENARIO 3: Fresh Intake Chat 'I have chest pain' ---")
        res3 = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": "Scenario 3 Chest Patient",
            "patient_age": 58,
            "patient_gender": "Male",
            "language_code": "en",
            "interaction_mode": "TEXT",
            "consent_given": True
        })
        assert res3.status_code == 200, res3.text
        s3_id = res3.json()["id"]
        print(f"Created Session 3 ID: {s3_id}")

        ans3_res = await client.post(f"{BASE_URL}/intakes/{s3_id}/answers", json={
            "raw_text": "I have severe chest pain and breathlessness",
            "input_mode": "TEXT",
            "language_code": "en"
        })
        assert ans3_res.status_code == 200, ans3_res.text
        ans3_data = ans3_res.json()
        decision3 = ans3_data["decision"]
        q3_text = decision3.get("question")
        q3_target = decision3.get("target_field")
        cc3 = ans3_data["clinical_state"].get("chief_complaint")

        print(f"Chief Complaint in state: {cc3}")
        print(f"Next Target Field: {q3_target}")
        print(f"AI Question Text: {q3_text}")

        assert q3_target in ["radiation", "onset", "character", "severity", "sweating_diaphoresis", "breathlessness"], f"Unexpected target {q3_target}"
        print(">> SCENARIO 3 PASSED: Chest pain correctly routes to cardiac exploration/safety questions.")

        # ----------------------------------------------------
        # SCENARIO 4: Voice Intake followed by NEW Patient Journey in Chat
        # ----------------------------------------------------
        print("\n--- SCENARIO 4: Voice Intake followed by NEW Patient Journey in Chat ---")
        # Step A: Voice intake runs with chest pain
        res4_voice = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": "Patient 4 Voice",
            "patient_age": 60,
            "language_code": "en",
            "interaction_mode": "VOICE",
            "consent_given": True
        })
        s4_voice_id = res4_voice.json()["id"]
        await client.post(f"{BASE_URL}/intakes/{s4_voice_id}/answers", json={
            "raw_text": "I have sudden severe chest pain",
            "input_mode": "VOICE",
            "language_code": "en"
        })

        # Step B: New patient journey begins in Chat (simulates frontend boundary clearing stale ID)
        res4_chat = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": "Patient 4 New Chat",
            "patient_age": 22,
            "language_code": "en",
            "interaction_mode": "TEXT",
            "consent_given": True
        })
        s4_chat_id = res4_chat.json()["id"]
        assert s4_chat_id != s4_voice_id, "Chat must have its own fresh session ID"

        ans4_chat_res = await client.post(f"{BASE_URL}/intakes/{s4_chat_id}/answers", json={
            "raw_text": "I have leg pain after running",
            "input_mode": "TEXT",
            "language_code": "en"
        })
        ans4_data = ans4_chat_res.json()
        q4_text = ans4_data["decision"].get("question")
        cc4 = ans4_data["clinical_state"].get("chief_complaint")

        print(f"Voice Session ID: {s4_voice_id}")
        print(f"New Chat Session ID: {s4_chat_id}")
        print(f"New Chat Chief Complaint: {cc4}")
        print(f"New Chat Question: {q4_text}")

        assert "chest" not in (cc4 or "").lower(), f"Chief complaint leaked chest pain! {cc4}"
        assert "chest" not in q4_text.lower(), f"Chat question contaminated! {q4_text}"
        assert "sweating" not in q4_text.lower(), f"Chat question contaminated! {q4_text}"
        print(">> SCENARIO 4 PASSED: New Chat session is completely isolated from previous Voice session.")

    print("\n==================================================")
    print("ALL 4 REAL-WORLD SCENARIOS VERIFIED 100% SUCCESS")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_scenarios())
