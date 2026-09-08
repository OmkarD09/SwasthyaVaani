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


# Let's test a scenario where a patient presents with multiple distinct uncharacterized complaints across 3 domains:
# e.g., "I have fever, stomach pain with vomiting, joint swelling, and cough."
# Every question asked, the patient only answers THAT question specifically without volunteering other dimensions.
async def test_multi_system_runaway():
    state = ClinicalState(chief_complaint="I have fever, stomach pain, vomiting, cough, and knee swelling.")
    state.raw_transcript_snippets.append("I have fever, stomach pain, vomiting, cough, and knee swelling.")
    # Notice: vomiting is in chief_complaint, so has_vomiting is True.
    # But hydration_status is NOT answered!
    # Because has_vomiting is True and hydration_status is not resolved, line 84:
    # if has_vomiting and not is_field_already_resolved("hydration_status", state): return False, None
    # This blocks sufficiency from terminating early!

    print("="*80)
    print("TESTING MULTI-DOMAIN PRESENTATION WITH DEFERRED RESOLUTIONS")
    print("="*80)

    # Patient answers specifically and minimally to each question:
    # Turn by turn:
    turns_data = [
        # Turn 1
        ("open_gi_exploration", "I have pain in my stomach and vomiting, nothing else in GI."),
        # Turn 2
        ("dark_stool_onset", "No black stool."),
        # Turn 3
        ("dark_stool_consistency", "No black stool at all."),
        # Turn 4
        ("stool_frequency", "Normal bowel movements once a day."),
        # Turn 5
        ("stool_consistency", "Normal consistency."),
        # Turn 6
        ("food_exposure", "No outside food, just normal meals."),
        # Turn 7
        ("duration", "For 4 days."),
        # Turn 8
        ("onset", "Started 4 days ago."),
        # Turn 9
        ("bloating", "No bloating."),
        # Turn 10
        ("abdominal_location", "Upper stomach."),
        # Turn 11
        ("hydration_status", "I am able to drink water normally."),
        # Turn 12
        ("cough_type", "Dry cough."),
        # Turn 13
        ("fever_pattern", "Continuous fever."),
        # Turn 14
        ("swelling_warmth", "Mild knee swelling."),
        # Turn 15
        ("severity", "Moderate pain, 5 out of 10.")
    ]

    for ceiling in [10, 12, 15]:
        s = ClinicalState(chief_complaint="I have fever, stomach pain, vomiting, cough, and knee swelling.")
        s.raw_transcript_snippets.append("I have fever, stomach pain, vomiting, cough, and knee swelling.")
        s.associated_symptoms = ["vomiting", "fever", "cough"]
        asked = []
        
        print(f"\n--- Running with CEILING = {ceiling} ---")
        for turn_idx in range(1, ceiling + 5):
            if turn_idx > ceiling:
                print(f"Brake hit at turn {turn_idx - 1} (MAX_QUESTIONS={ceiling})!")
                domains = classify_clinical_domains(s, "GENERAL_CLINICAL")
                cands = score_candidate_dimensions(domains, s, asked, set(s.resolved_dimensions))
                viable = [c for c in cands if not is_field_already_resolved(c["field_name"], s) and c["score"] > 0]
                print(f"Remaining viable candidates at brake: {len(viable)}")
                for c in viable[:5]:
                    print(f"   - {c['field_name']} (score={c['score']}, mode={c['reasoning_mode']}, domain={c['domain']})")
                break

            domains = classify_clinical_domains(s, "GENERAL_CLINICAL")
            primary_domain = domains[0] if domains else ClinicalDomain.GENERAL
            cands = score_candidate_dimensions(domains, s, asked, set(s.resolved_dimensions))
            viable = [c for c in cands if not is_field_already_resolved(c["field_name"], s) and c["score"] > 0]
            
            is_suff, suff_reason = _assess_information_sufficiency(s, primary_domain, viable, turn_idx - 1)
            if is_suff:
                print(f"Sufficiency achieved at turn {turn_idx - 1}: {suff_reason}")
                break
            if not viable:
                print(f"No viable candidates left at turn {turn_idx - 1}.")
                break

            sel = viable[0]
            tf = sel["field_name"]
            asked.append(f"Q{turn_idx}: {tf}")
            if tf not in s.resolved_dimensions:
                s.resolved_dimensions.append(tf)

            # Patient answers this specific question
            matched_ans = "Normal, no problem."
            for t_field, t_ans in turns_data:
                if t_field == tf:
                    matched_ans = t_ans
                    break
            
            s, _, _ = extract_clinical_facts_from_answer(matched_ans, tf, s)
            print(f"Turn {turn_idx}: Asked [{tf}] (score={sel['score']}, mode={sel['reasoning_mode']}) -> Answered: '{matched_ans[:40]}'")

asyncio.run(test_multi_system_runaway())
