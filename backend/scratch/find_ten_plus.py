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


# Systematic simulation to find presentations that actually hit 10, 11, 12, 13, 14, 15
# Case 1: Complex Geriatric Polypharmacy / Multi-Complaint (Chronic cough + knee pain + burning urination + dizziness)
# Case 2: Full Dashavidha Pariksha in AYUSH where multiple dimensions have contextual relevance
async def explore_ceiling_hits():
    test_cases = [
        {
            "name": "Multi-System: Respiratory + MSK + Urinary",
            "workflow": "GENERAL_CLINICAL",
            "cc": "I have continuous dry cough, swollen painful right knee, and burning when urinating.",
            # Each answer is focused strictly on the question asked
            "answers": {
                "open_general_exploration": "Cough, knee pain, and burning urination all started together.",
                "open_respiratory_exploration": "Mainly dry cough, no breathlessness.",
                "cough_type": "Dry hacking cough.",
                "breathlessness": "No breathlessness.",
                "fever": "No fever.",
                "duration": "For 10 days.",
                "onset": "Started 10 days ago.",
                "swelling_warmth": "Knee is swollen and stiff in morning.",
                "injury_history": "No injury.",
                "dysuria_burning": "Severe burning pain every time I pee.",
                "urinary_frequency": "Going every hour.",
                "location": "Right knee and chest.",
                "severity": "Pain is 6 out of 10.",
                "hematuria_blood": "No blood in urine.",
                "flank_pain": "No flank pain.",
                "sputum_color": "No sputum."
            }
        },
        {
            "name": "Extended Dashavidha AYUSH Evaluation (High Contextual Boosts)",
            "workflow": "AYUSH",
            "cc": "I have severe metabolic sluggishness (Mandagni), chronic constipation, anxiety and tension, extreme physical fatigue, and difficulty digesting meals.",
            # This triggers contextual boosts for sattva (+35), vyayama_shakti (+35), ahara_shakti (+30), satmya (+30)
            "answers": {
                "open_ayush_exploration": "Digestion is very weak, severe tension and anxiety, constantly fatigued.",
                "agni": "Mandagni: food takes 6 hours to digest, heavy feeling.",
                "koshtha": "Krura koshtha: hard stools every 3 days.",
                "ahara_vihara": "Eating fried snacks late at night, irregular habits.",
                "sattva": "Severe anxiety, disturbed mind, low emotional resilience.",
                "vyayama_shakti": "Exhausted after 100 meters, extreme fatigue and low stamina.",
                "ahara_shakti": "Cannot eat full meal, low digestive capacity.",
                "satmya": "Intolerant to cold foods, dairy, and fermented items.",
                "location": "Stomach and whole body.",
                "duration": "For the past 1 year.",
                "sleep_pattern": "Insomnia, waking at 3 AM.",
                "relieving_factors": "Warm water fasting.",
                "onset": "Gradual over 1 year.",
                "sara": "Poor vitality, pale.",
                "samhanana": "Lean body build."
            }
        }
    ]

    for tc in test_cases:
        print(f"\n================================================================================")
        print(f"CASE: {tc['name']}")
        print(f"================================================================================")
        
        for ceil in [10, 12, 15]:
            s = ClinicalState(chief_complaint=tc["cc"])
            s.raw_transcript_snippets.append(tc["cc"])
            s, _, _ = extract_clinical_facts_from_answer(tc["cc"], "chief_complaint", s)
            asked = []
            brake_hit = False
            term_turn = None
            term_reason = None
            remaining_viable = []

            for turn in range(1, ceil + 5):
                if turn > ceil:
                    brake_hit = True
                    term_turn = turn - 1
                    term_reason = f"Safety limit reached (MAX_QUESTIONS={ceil}). Marking as LIMITED_HISTORY."
                    domains = classify_clinical_domains(s, tc["workflow"])
                    cands = score_candidate_dimensions(domains, s, asked, set(s.resolved_dimensions))
                    remaining_viable = [c for c in cands if not is_field_already_resolved(c["field_name"], s) and c["score"] > 0]
                    break

                domains = classify_clinical_domains(s, tc["workflow"])
                primary_domain = domains[0] if domains else ClinicalDomain.GENERAL
                cands = score_candidate_dimensions(domains, s, asked, set(s.resolved_dimensions))
                viable = [c for c in cands if not is_field_already_resolved(c["field_name"], s) and c["score"] > 0]

                is_suff, suff_reason = _assess_information_sufficiency(s, primary_domain, viable, turn - 1)
                if is_suff:
                    term_turn = turn - 1
                    term_reason = suff_reason
                    remaining_viable = viable
                    break

                if not viable:
                    term_turn = turn - 1
                    term_reason = "All candidates resolved."
                    remaining_viable = []
                    break

                sel = viable[0]
                tf = sel["field_name"]
                asked.append(f"Q{turn}: {tf}")
                if tf not in s.resolved_dimensions:
                    s.resolved_dimensions.append(tf)

                reply = tc["answers"].get(tf, "No, not present.")
                s, _, _ = extract_clinical_facts_from_answer(reply, tf, s)
                if ceil == 15:
                    print(f"   Turn {turn}: Asked [{tf}] (score={sel['score']}, mode={sel['reasoning_mode']})")

            print(f"Ceiling {ceil}: Stopped at turn {term_turn} | Brake Hit: {brake_hit}")
            print(f"   Reason: {term_reason}")
            if remaining_viable:
                cand_strs = [f"{c['field_name']}({c['score']}, {c['reasoning_mode']})" for c in remaining_viable[:4]]
                print(f"   Remaining viable ({len(remaining_viable)}): {', '.join(cand_strs)}")

asyncio.run(explore_ceiling_hits())
