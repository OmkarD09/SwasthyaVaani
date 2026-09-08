import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question, _assess_information_sufficiency
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.question_scorer import (
    score_candidate_dimensions,
    is_field_already_resolved,
    MAP_TO_CANONICAL
)
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.services.safety.red_flags import evaluate_red_flags


EDGE_CASES = {
    "Case A: Melena / Dark Stool with Dizziness": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have been passing dark black stool and feeling very dizzy.",
        "profile": {
            "open_gi_exploration": "Black tarry stool for 2 days, feeling faint, stomach discomfort.",
            "dark_stool_onset": "Started 2 days ago in the morning.",
            "dark_stool_consistency": "Sticky, tarry, and foul smelling black stool.",
            "hydration_status": "Dizzy on standing, dry mouth, weakness.",
            "blood_in_stool": "No bright red blood, completely black.",
            "abdominal_location": "Upper abdomen pain, burning.",
            "meal_relationship": "Pain gets worse before food.",
            "vomiting": "Nausea, no vomiting yet.",
            "duration": "2 days.",
            "food_exposure": "No outside food.",
            "antacid_relief": "None."
        }
    },
    "Case B: Poly-Symptomatic Multi-System (Systemic/Autoimmune)": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have prolonged fever, swollen painful wrist and knee joints, skin rash on cheeks, and extreme fatigue.",
        "profile": {
            "open_general_exploration": "Fever for 3 weeks, joints swollen, butterfly rash, fatigue.",
            "open_msk_exploration": "Wrists and knees swollen, morning stiffness 2 hours.",
            "location": "Wrists, knees, and cheeks.",
            "duration": "For 3 weeks.",
            "swelling_warmth": "Warmth and swelling in both wrists.",
            "fever_pattern": "Spiking fever in evenings with rigors.",
            "itching_pruritus": "Cheek rash is burning and red, sensitive to light.",
            "character": "Throbbing joint pain and hot rash.",
            "associated_bodyache": "Generalized muscle aches.",
            "injury_history": "No trauma.",
            "breathlessness": "Mild breathlessness on climbing stairs.",
            "cough_type": "No cough."
        }
    },
    "Case C: Comprehensive AYUSH Constitutional & Morbidity Intake": {
        "workflow": "AYUSH",
        "chief_complaint": "I have severe metabolic sluggishness, chronic acidity (Amlapitta), severe stress, disturbed sleep, generalized fatigue, and food intolerances.",
        "profile": {
            "open_ayush_exploration": "Chronic digestive burning, insomnia, severe work stress, extreme fatigue, irregular bowels.",
            "agni": "Mandagni with Vidagdha jeerna: sluggish digestion with severe acid reflux and burning.",
            "koshtha": "Krura koshtha: hard irregular stools, constipation every other day.",
            "ahara_vihara": "Late night spicy dinners at 11:30 PM, heavy oily fried food, excessive coffee.",
            "sleep_pattern": "Insomnia, disturbed sleep waking up 3-4 times at night, heavy morning fatigue.",
            "sattva": "Severe anxiety, chronic mental stress, low emotional resilience (Avara sattva).",
            "vyayama_shakti": "Exhaustion after minimal exertion, cannot walk 500 meters (Avara vyayama shakti).",
            "ahara_shakti": "Poor intake capacity, feeling bloated and full after 2 bites (Avara ahara shakti).",
            "satmya": "Intolerant to dairy, wheat, and sour foods; allergic to cold weather.",
            "location": "Upper abdomen, retrosternal chest, and generalized body.",
            "duration": "Suffering for 8 months.",
            "relieving_factors": "Fasting and warm water gives slight relief.",
            "onset": "Gradual onset 8 months ago."
        }
    },
    "Case D: Undifferentiated Multi-System with Vague Early Presentation": {
        "workflow": "GENERAL_CLINICAL",
        "chief_complaint": "I have general body weakness, slight chest heaviness, mild cough, and burning urination.",
        "profile": {
            "open_general_exploration": "I feel unwell all over: weak, slight chest heaviness, occasional cough, and burning when peeing.",
            "clarify_problem": "Weakness and burning urination are the main troubles.",
            "duration": "For 5 days.",
            "dysuria_burning": "Burning pain every time I pass urine.",
            "urinary_frequency": "Going to the bathroom frequently.",
            "cough_type": "Dry cough occasionally.",
            "breathlessness": "No shortness of breath, just mild chest heaviness.",
            "fever": "Low grade fever at night.",
            "location": "Lower abdomen and chest.",
            "severity": "Mild to moderate, about 4 out of 10.",
            "hematuria_blood": "No blood in urine.",
            "flank_pain": "No back pain."
        }
    }
}


async def run_edge_cases():
    print("="*110)
    print("TESTING EDGE CASES FOR CEILINGS 10 vs 12 vs 15")
    print("="*110)

    for case_name, case_data in EDGE_CASES.items():
        workflow = case_data["workflow"]
        cc = case_data["chief_complaint"]
        profile = case_data["profile"]

        for max_c in [10, 12, 15]:
            state = ClinicalState(chief_complaint=cc)
            state.raw_transcript_snippets.append(cc)
            state, _, _ = extract_clinical_facts_from_answer(cc, "chief_complaint", state)
            asked = []
            
            terminated = False
            term_turn = None
            term_reason = None
            hit_brake = False
            remaining_viable = []

            for turn in range(1, max_c + 5):
                # Max brake check
                if turn > max_c:
                    hit_brake = True
                    terminated = True
                    term_turn = turn - 1
                    term_reason = f"Safety limit reached (MAX_QUESTIONS={max_c}). Marking as LIMITED_HISTORY."
                    domains = classify_clinical_domains(state, workflow)
                    cands = score_candidate_dimensions(domains, state, asked, set(state.resolved_dimensions))
                    remaining_viable = [c for c in cands if not is_field_already_resolved(c["field_name"], state) and c["score"] > 0]
                    break

                domains = classify_clinical_domains(state, workflow)
                primary_domain = domains[0] if domains else ClinicalDomain.GENERAL
                cands = score_candidate_dimensions(domains, state, asked, set(state.resolved_dimensions))
                viable = [c for c in cands if not is_field_already_resolved(c["field_name"], state) and c["score"] > 0]

                is_suff, suff_reason = _assess_information_sufficiency(state, primary_domain, viable, turn - 1)
                if is_suff:
                    terminated = True
                    term_turn = turn - 1
                    term_reason = suff_reason
                    remaining_viable = viable
                    break

                if not viable:
                    terminated = True
                    term_turn = turn - 1
                    term_reason = "All viable candidates resolved."
                    remaining_viable = []
                    break

                # Pick top viable
                sel = viable[0]
                target_field = sel["field_name"]
                asked.append(f"Q{turn}: {target_field}")
                if target_field not in state.resolved_dimensions:
                    state.resolved_dimensions.append(target_field)

                ans = profile.get(target_field, "No, not present.")
                state, _, _ = extract_clinical_facts_from_answer(ans, target_field, state)

            print(f"[{case_name}] Ceiling={max_c} -> Terminated at Turn {term_turn} | Hit Brake: {hit_brake}")
            print(f"   Reason: {term_reason}")
            if remaining_viable:
                cand_strs = [f"{c['field_name']}({c['score']})" for c in remaining_viable[:4]]
                print(f"   Remaining viable ({len(remaining_viable)}): {', '.join(cand_strs)}")
            print()

asyncio.run(run_edge_cases())
