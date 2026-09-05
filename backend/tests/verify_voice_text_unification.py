import asyncio
import httpx
import json
import sys
from typing import Dict, Any, List

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api/v1"


async def run_consultation(
    patient_name: str,
    modality: str,
    language_code: str,
    inputs: List[str]
) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create session
        init_res = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": patient_name,
            "patient_age": 32,
            "language_code": language_code,
            "interaction_mode": modality,
            "workflow_type": "GENERAL_CLINICAL"
        })
        intake_id = init_res.json()["id"]

        trajectory = []
        for idx, text_input in enumerate(inputs):
            res = await client.post(f"{BASE_URL}/intakes/{intake_id}/answers", json={
                "raw_text": text_input,
                "input_mode": modality,
                "language_code": language_code
            })
            data = res.json()
            dec = data["decision"]
            state = data["clinical_state"]
            trajectory.append({
                "turn": idx + 1,
                "input": text_input,
                "target_dimension": dec.get("target_field"),
                "action": dec.get("action"),
                "question": dec.get("question"),
                "chief_complaint": state.get("chief_complaint"),
                "duration": state.get("duration"),
                "location": state.get("location"),
                "red_flags": state.get("red_flags", [])
            })
            if dec.get("action") == "STOP":
                break

        return {
            "intake_id": intake_id,
            "patient_name": patient_name,
            "modality": modality,
            "language_code": language_code,
            "trajectory": trajectory
        }


async def main():
    print("=" * 80)
    print("SWASTHYAVAANI — VOICE + TEXT UNIFIED THINKING ENGINE VERIFICATION")
    print("=" * 80)

    # 1. TEXT HEADACHE
    print("\n--- [TEST 1: TEXT HEADACHE CONSULTATION] ---")
    t_headache = await run_consultation(
        patient_name="Priya Text",
        modality="TEXT",
        language_code="en",
        inputs=[
            "I have a headache.",
            "Since two days.",
            "Mostly on the right side and bright light makes it worse."
        ]
    )
    for step in t_headache["trajectory"]:
        print(f"Turn {step['turn']}: Input: \"{step['input']}\"")
        print(f"  -> State: CC='{step['chief_complaint']}', Dur='{step['duration']}', Loc='{step['location']}'")
        print(f"  -> Target Dimension: {step['target_dimension']} | Action: {step['action']}")
        print(f"  -> Next Question: \"{step['question']}\"\n")

    # 2. VOICE HEADACHE
    print("\n--- [TEST 2: VOICE HEADACHE CONSULTATION (Identical Clinical Inputs)] ---")
    v_headache = await run_consultation(
        patient_name="Priya Voice",
        modality="VOICE",
        language_code="en",
        inputs=[
            "I have a headache.",
            "Since two days.",
            "Mostly on the right side and bright light makes it worse."
        ]
    )
    for step in v_headache["trajectory"]:
        print(f"Turn {step['turn']}: Input: \"{step['input']}\"")
        print(f"  -> State: CC='{step['chief_complaint']}', Dur='{step['duration']}', Loc='{step['location']}'")
        print(f"  -> Target Dimension: {step['target_dimension']} | Action: {step['action']}")
        print(f"  -> Next Question: \"{step['question']}\"\n")

    # 3. TEXT GI CONSULTATION
    print("\n--- [TEST 3: TEXT GI CONSULTATION (Pain + Loose Motions)] ---")
    t_gi = await run_consultation(
        patient_name="Ramesh Text",
        modality="TEXT",
        language_code="en",
        inputs=[
            "I have stomach pain and loose motions since yesterday.",
            "I ate outside food before it started.",
            "I also vomited twice."
        ]
    )
    for step in t_gi["trajectory"]:
        print(f"Turn {step['turn']}: Input: \"{step['input']}\"")
        print(f"  -> Target Dimension: {step['target_dimension']} | Action: {step['action']}")
        print(f"  -> Next Question: \"{step['question']}\"\n")

    # 4. VOICE GI CONSULTATION
    print("\n--- [TEST 4: VOICE GI CONSULTATION (Pain + Loose Motions)] ---")
    v_gi = await run_consultation(
        patient_name="Ramesh Voice",
        modality="VOICE",
        language_code="en",
        inputs=[
            "I have stomach pain and loose motions since yesterday.",
            "I ate outside food before it started.",
            "I also vomited twice."
        ]
    )
    for step in v_gi["trajectory"]:
        print(f"Turn {step['turn']}: Input: \"{step['input']}\"")
        print(f"  -> Target Dimension: {step['target_dimension']} | Action: {step['action']}")
        print(f"  -> Next Question: \"{step['question']}\"\n")

    # 5. DIRECT COMPARISON & EQUIVALENCE CHECK
    print("\n--- [TEST 5: SIDE-BY-SIDE EQUIVALENCE AUDIT] ---")
    print(f"{'Turn':<6} | {'Modality':<6} | {'Target Dimension':<22} | {'Action':<6} | {'Clinical State Progress'}")
    print("-" * 80)
    for t_step, v_step in zip(t_headache["trajectory"], v_headache["trajectory"]):
        print(f"{t_step['turn']:<6} | {'TEXT':<6} | {str(t_step['target_dimension']):<22} | {t_step['action']:<6} | Loc={t_step['location']}, Dur={t_step['duration']}")
        print(f"{v_step['turn']:<6} | {'VOICE':<6} | {str(v_step['target_dimension']):<22} | {v_step['action']:<6} | Loc={v_step['location']}, Dur={v_step['duration']}")
        print("-" * 80)

    # 6. DIRECT AUDIO FILE UPLOAD ENDPOINT CHECK
    print("\n--- [TEST 6: DIRECT AUDIO FILE UPLOAD (Sarvam ASR + Core Engine + Sarvam TTS)] ---")
    async with httpx.AsyncClient(timeout=30.0) as client:
        init_res = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": "Audio Pipeline Patient",
            "language_code": "hi",
            "interaction_mode": "VOICE"
        })
        sess_id = init_res.json()["id"]
        
        # Post simulated audio bytes
        fake_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00"
        files = {"file": ("recording.wav", fake_wav, "audio/wav")}
        data = {"language_code": "hi"}
        
        va_res = await client.post(f"{BASE_URL}/intakes/{sess_id}/voice-answer", files=files, data=data)
        va_data = va_res.json()
        print(f"Direct Voice Endpoint HTTP Status: {va_res.status_code}")
        print(f"Transcribed ASR Text: \"{va_data.get('transcript_text')}\"")
        print(f"Detected Language: {va_data.get('detected_language')}")
        print(f"Core Engine Decision Action: {va_data.get('decision', {}).get('action')}")
        print(f"Core Engine Target Field: {va_data.get('decision', {}).get('target_field')}")
        print(f"Synthesized Question: \"{va_data.get('decision', {}).get('question')}\"")


if __name__ == "__main__":
    asyncio.run(main())
