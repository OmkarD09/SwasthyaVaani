import asyncio
import httpx
import json
import sys
from typing import Dict, Any, List

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api/v1"


async def run_consultation_flow(patient_name: str, initial_complaint: str, follow_up_answers: List[str]) -> Dict[str, Any]:
    """Helper to execute an end-to-end patient consultation via real REST API."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Start Intake
        init_res = await client.post(f"{BASE_URL}/intakes", json={
            "patient_name": patient_name,
            "patient_age": 34,
            "patient_gender": "Other",
            "workflow_type": "GENERAL_CLINICAL",
            "language_code": "en",
            "interaction_mode": "TEXT"
        })
        intake_data = init_res.json()
        intake_id = intake_data["id"]
        
        trajectory = []
        
        # Turn 0: Send initial complaint
        ans_res = await client.post(f"{BASE_URL}/intakes/{intake_id}/answers", json={
            "raw_text": initial_complaint,
            "language_code": "en",
            "input_mode": "TEXT"
        })
        ans_data = ans_res.json()
        trajectory.append({
            "turn": 0,
            "input": initial_complaint,
            "next_action": ans_data["decision"]["action"],
            "next_question": ans_data["decision"].get("question"),
            "target_field": ans_data["decision"].get("target_field"),
            "reason": ans_data["decision"].get("reason"),
            "clinical_state": ans_data["clinical_state"]
        })

        # Process follow-up turns
        for turn_idx, answer in enumerate(follow_up_answers):
            if ans_data["decision"]["action"] == "STOP":
                break
            
            ans_res = await client.post(f"{BASE_URL}/intakes/{intake_id}/answers", json={
                "raw_text": answer,
                "language_code": "en",
                "input_mode": "TEXT"
            })
            ans_data = ans_res.json()
            trajectory.append({
                "turn": turn_idx + 1,
                "input": answer,
                "next_action": ans_data["decision"]["action"],
                "next_question": ans_data["decision"].get("question"),
                "target_field": ans_data["decision"].get("target_field"),
                "reason": ans_data["decision"].get("reason"),
                "clinical_state": ans_data["clinical_state"]
            })

        # Submit intake for physician review
        submit_res = await client.post(f"{BASE_URL}/intakes/{intake_id}/submit")

        return {
            "intake_id": intake_id,
            "patient_name": patient_name,
            "trajectory": trajectory,
            "final_state": ans_data["clinical_state"],
            "submit_status": submit_res.status_code
        }


async def main():
    print("=" * 80)
    print("SWASTHYAVAANI -- STRICT END-TO-END BEHAVIORAL VERIFICATION")
    print("=" * 80)

    # 1. HEADACHE TEST
    print("\n--- [TEST 1: HEADACHE FLOW] ---")
    headache_results = await run_consultation_flow(
        patient_name="Aarav Sharma (Headache)",
        initial_complaint="I have a headache.",
        follow_up_answers=[
            "Since two days.",
            "Mostly on the right side.",
            "Bright light makes it worse.",
            "No visual flashes or nausea."
        ]
    )
    for t in headache_results["trajectory"]:
        print(f"Turn {t['turn']}: Input: '{t['input']}'")
        print(f"  -> Action: {t['next_action']} | Target Field: {t['target_field']}")
        print(f"  -> Question: \"{t['next_question']}\"")
        print(f"  -> Rationale: {t['reason']}\n")

    # 2. GI CASE A
    print("\n--- [TEST 2: GI CASE A (Stomach Pain + Loose Motions)] ---")
    gi_a_results = await run_consultation_flow(
        patient_name="Pooja Verma (GI Case A)",
        initial_complaint="I have stomach pain since yesterday and loose motions.",
        follow_up_answers=[
            "Around 4 to 5 times watery stools today.",
            "I ate street food at a stall yesterday evening.",
            "No fever or vomiting."
        ]
    )
    for t in gi_a_results["trajectory"]:
        print(f"Turn {t['turn']}: Input: '{t['input']}'")
        print(f"  -> Action: {t['next_action']} | Target Field: {t['target_field']}")
        print(f"  -> Question: \"{t['next_question']}\"\n")

    # 3. GI CASE B
    print("\n--- [TEST 3: GI CASE B (Stomach Pain + Outside Food + Vomiting)] ---")
    gi_b_results = await run_consultation_flow(
        patient_name="Rajesh Patel (GI Case B)",
        initial_complaint="I have stomach pain after eating outside food and I am vomiting.",
        follow_up_answers=[
            "I vomited 3 times and feeling very weak.",
            "The pain is in the upper stomach with burning acidity.",
            "Since yesterday night."
        ]
    )
    for t in gi_b_results["trajectory"]:
        print(f"Turn {t['turn']}: Input: '{t['input']}'")
        print(f"  -> Action: {t['next_action']} | Target Field: {t['target_field']}")
        print(f"  -> Question: \"{t['next_question']}\"\n")

    # 4. CRITICAL DIVERGENCE COMPARISON
    print("\n--- [TEST 4: CRITICAL DIVERGENCE (GI Case A vs GI Case B)] ---")
    path_a = [f"T{t['turn']}:{t['target_field']}" for t in gi_a_results['trajectory']]
    path_b = [f"T{t['turn']}:{t['target_field']}" for t in gi_b_results['trajectory']]
    print(f"GI Case A Path: {' -> '.join(path_a)}")
    print(f"GI Case B Path: {' -> '.join(path_b)}")
    diverged = path_a != path_b
    print(f"-> Genuinely Diverged: {diverged}")

    # 5. SAME COMPLAINT / DIFFERENT INFORMATION TEST
    print("\n--- [TEST 5: SAME COMPLAINT / DIFFERENT INFORMATION TEST] ---")
    p_plain = await run_consultation_flow(
        patient_name="Patient Plain Stomach",
        initial_complaint="I have stomach pain.",
        follow_up_answers=["Upper abdomen", "Mild cramp"]
    )
    p_food = await run_consultation_flow(
        patient_name="Patient Food Poisoning",
        initial_complaint="I have stomach pain after eating outside food with vomiting and loose motions.",
        follow_up_answers=["4 times loose motions", "Since 6 hours"]
    )
    print(f"Patient Plain Question 1 Target: {p_plain['trajectory'][0]['target_field']} (Question: {p_plain['trajectory'][0]['next_question']})")
    print(f"Patient Food Poisoning Q1 Target: {p_food['trajectory'][0]['target_field']} (Question: {p_food['trajectory'][0]['next_question']})")

    # 6. NON-PAIN COUGH TEST
    print("\n--- [TEST 6: NON-PAIN COUGH] ---")
    cough_results = await run_consultation_flow(
        patient_name="Sanjay Gupta (Cough)",
        initial_complaint="I have been coughing for three days.",
        follow_up_answers=[
            "It is a dry hacking cough with no phlegm.",
            "No difficulty in breathing or shortness of breath."
        ]
    )
    pain_asked = False
    for t in cough_results["trajectory"]:
        print(f"Turn {t['turn']}: Input: '{t['input']}'")
        print(f"  -> Target: {t['target_field']} | Question: \"{t['next_question']}\"")
        if t['next_question'] and any(w in t['next_question'].lower() for w in ["pain scale", "1 to 10", "pain severity", "sharp or burning"]):
            pain_asked = True
    print(f"-> Pain questions asked during painless cough: {pain_asked} (Expected: False)")

    # 7. ALREADY KNOWN DURATION TEST
    print("\n--- [TEST 7: ALREADY-KNOWN DURATION] ---")
    fever_results = await run_consultation_flow(
        patient_name="Neha Joshi (Fever)",
        initial_complaint="I have had fever for three days.",
        follow_up_answers=["Continuous high fever with chills."]
    )
    duration_asked = False
    for t in fever_results["trajectory"]:
        print(f"Turn {t['turn']}: Input: '{t['input']}'")
        print(f"  -> Target: {t['target_field']} | Question: \"{t['next_question']}\"")
        if t['target_field'] == "duration" or (t['next_question'] and "how long" in t['next_question'].lower()):
            duration_asked = True
    print(f"-> Redundant duration asked when already stated: {duration_asked} (Expected: False)")

    # 8. VAGUE COMPLAINT TEST
    print("\n--- [TEST 8: VAGUE COMPLAINT CLARIFICATION] ---")
    vague_results = await run_consultation_flow(
        patient_name="Anil Kumar (Vague)",
        initial_complaint="I have some problem with my stomach.",
        follow_up_answers=["I have burning acidity and gas."]
    )
    first_follow_up = vague_results["trajectory"][0]
    print(f"Initial: 'I have some problem with my stomach.'")
    print(f"-> First Target Field: {first_follow_up['target_field']}")
    print(f"-> First Question: \"{first_follow_up['next_question']}\"")

    # 9. DOCTOR QUEUE VERIFICATION
    print("\n--- [TEST 9: DOCTOR QUEUE & DATABASE AUDIT] ---")
    async with httpx.AsyncClient(timeout=10.0) as client:
        q_res = await client.get(f"{BASE_URL}/doctor/queue")
        queue = q_res.json()
        print(f"Doctor Queue Total Patients: {len(queue)}")
        if queue:
            latest = queue[0]
            print(f"Latest Patient in Queue: {latest.get('patient_name')}")
            print(f"Chief Complaint: {latest.get('chief_complaint')}")
            print(f"Priority: {latest.get('priority')} | Status: {latest.get('status')}")


if __name__ == "__main__":
    asyncio.run(main())
