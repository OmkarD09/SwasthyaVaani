import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question, _assess_information_sufficiency
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.question_scorer import (
    score_candidate_dimensions,
    is_field_already_resolved
)
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer


async def test_when_does_it_hit_10():
    """
    Scenario where a patient presents with multiple distinct uncharacterized complaints:
    Say, someone presents with: "I have joint pains all over, intermittent mild fever, occasional dry cough, skin rashes, and burning urination."
    Primary domain: MUSCULOSKELETAL.
    Domain-specific sufficiency for MSK is:
    has_loc = is_field_already_resolved("location", state)
    has_swelling_or_trauma = is_field_already_resolved("swelling_warmth", state) or is_field_already_resolved("injury_history", state) or "other_symptoms" in state.negated_symptoms
    if has_loc or has_swelling_or_trauma: return True
    Notice: If has_loc is True, MSK sufficiency triggers IMMEDIATELY!
    And if the patient said "knee pain", location is ALREADY resolved in chief complaint!
    So MSK stops at turn 3!
    What about GENERAL domain?
    In GENERAL, chief complaint: "I feel sick and have discomfort in multiple areas."
    (No specific organ domain classified)
    Let's test what happens for purely GENERAL domain.
    """
    s = ClinicalState(chief_complaint="I have multiple health issues and feel unwell.")
    s.raw_transcript_snippets.append("I have multiple health issues and feel unwell.")
    s, _, _ = extract_clinical_facts_from_answer("I have multiple health issues and feel unwell.", "chief_complaint", s)

    domains = classify_clinical_domains(s, "GENERAL_CLINICAL")
    print(f"Classified Domains: {domains}")
    
    asked = []
    # Patient provides meaningful answers on each turn to different dimensions without volunteer-resolving others:
    answers = {
        "open_general_exploration": "I have fatigue, mild body aches, headache, and poor appetite.",
        "clarify_problem": "Mainly severe exhaustion and headache.",
        "duration": "For 2 weeks.",
        "onset": "Started gradually 2 weeks ago.",
        "severity": "Severity is 6 out of 10.",
        "location": "Generalized body and head.",
        "character": "Dull persistent ache.",
        "associated_symptoms": "Low energy and feeling lightheaded occasionally."
    }

    for turn in range(1, 15):
        cands = score_candidate_dimensions(domains, s, asked, set(s.resolved_dimensions))
        viable = [c for c in cands if not is_field_already_resolved(c["field_name"], s) and c["score"] > 0]
        
        is_suff, suff_reason = _assess_information_sufficiency(s, domains[0], viable, turn - 1)
        print(f"Turn {turn}: Viable count = {len(viable)} | Sufficiency = {is_suff}")
        if is_suff:
            print(f"   -> Stopped: {suff_reason}")
            break
        if not viable:
            print(f"   -> Stopped: No viable candidates left.")
            break
        
        sel = viable[0]
        tf = sel["field_name"]
        print(f"   -> Asking [{tf}] (score={sel['score']}, mode={sel['reasoning_mode']})")
        asked.append(f"Q{turn}: {tf}")
        s.resolved_dimensions.append(tf)
        ans = answers.get(tf, "Nothing else.")
        s, _, _ = extract_clinical_facts_from_answer(ans, tf, s)

asyncio.run(test_when_does_it_hit_10())
