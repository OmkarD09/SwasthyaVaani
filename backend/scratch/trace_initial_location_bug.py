import asyncio
import json
import sys
import os

# Set stdout to utf-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.clinical_state import ClinicalState
from app.services.providers.factory import get_llm_service
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.question_scorer import (
    score_candidate_dimensions,
    is_field_already_resolved,
    MAP_TO_CANONICAL,
    SEMANTIC_CLUSTERS,
    DOMAIN_DIMENSIONS,
)
from app.services.clinical_ai.adaptive_engine import evaluate_next_question

async def trace_case(name: str, raw_text: str, language_code: str):
    print("=" * 80)
    print(f"CASE: {name}")
    print(f"Raw patient answer: {raw_text!r}")
    print(f"Language code: {language_code!r}")
    print("=" * 80)

    # Turn 0 state before patient answer
    initial_state = ClinicalState()
    target_field = "chief_complaint"

    # Step 1 & 2: LLM Extraction
    llm = get_llm_service()
    print(f"Active LLM Service: {llm.__class__.__name__}")
    
    extraction_res = await llm.extract_clinical_facts(
        raw_text=raw_text,
        current_state=initial_state,
        language_code=language_code,
        target_field=target_field
    )

    print("\n--- 2. LLM EXTRACTION RESULT ---")
    print(f"Provider: {extraction_res.provider_name}")
    print(f"Raw LLM Response: {extraction_res.raw_response}")
    extracted_facts = dict(extraction_res.extracted_facts)
    print("Extracted Facts dict:")
    print(json.dumps(extracted_facts, indent=2, ensure_ascii=False))

    print(f"  chief_complaint: {extracted_facts.get('chief_complaint')!r}")
    print(f"  location: {extracted_facts.get('location')!r}")
    print(f"  character: {extracted_facts.get('character')!r}")
    print(f"  associated_symptoms: {extracted_facts.get('associated_symptoms')!r}")
    print(f"  negated_symptoms: {extracted_facts.get('negated_symptoms')!r}")

    # Step 3: Merge into ClinicalState (same as intakes.py)
    updated_dict = initial_state.model_dump()
    for k, v in extracted_facts.items():
        if v is not None:
            if k == "chief_complaint" and initial_state.chief_complaint:
                continue
            if isinstance(v, list) and isinstance(updated_dict.get(k), list):
                updated_dict[k] = [*updated_dict[k]]
                for item in v:
                    if item not in updated_dict[k]:
                        updated_dict[k].append(item)
            elif isinstance(v, dict) and isinstance(updated_dict.get(k), dict):
                updated_dict[k] = {**updated_dict[k], **v}
            else:
                updated_dict[k] = v
    updated_state = ClinicalState(**updated_dict)
    if raw_text and raw_text not in updated_state.raw_transcript_snippets:
        updated_state.raw_transcript_snippets.append(raw_text)
    if not updated_state.chief_complaint and raw_text:
        updated_state.chief_complaint = raw_text.strip()

    print("\n--- 3. ClinicalState IMMEDIATELY AFTER TURN 1 ---")
    print(f"  chief_complaint: {updated_state.chief_complaint!r}")
    print(f"  location: {updated_state.location!r}")
    print(f"  character: {updated_state.character!r}")
    print(f"  duration: {updated_state.duration!r}")
    print(f"  severity: {updated_state.severity!r}")
    print(f"  symptoms: {updated_state.symptoms!r}")
    print(f"  associated_symptoms: {updated_state.associated_symptoms!r}")
    print(f"  negated_symptoms: {updated_state.negated_symptoms!r}")
    print(f"  raw_transcript_snippets: {updated_state.raw_transcript_snippets!r}")

    print("\n--- 4. canonical_dimensions AFTER TURN 1 ---")
    print(json.dumps({k: v.model_dump() for k, v in updated_state.canonical_dimensions.items()}, indent=2, ensure_ascii=False))

    print("\n--- 5. resolved_dimensions AFTER TURN 1 ---")
    print(updated_state.resolved_dimensions)

    print("\n--- 6. is_field_already_resolved CHECKS ---")
    print(f"  is_field_already_resolved('location'): {is_field_already_resolved('location', updated_state)}")
    print(f"  is_field_already_resolved('distribution'): {is_field_already_resolved('distribution', updated_state)}")
    print(f"  is_field_already_resolved('chief_complaint'): {is_field_already_resolved('chief_complaint', updated_state)}")
    print(f"  is_field_already_resolved('duration'): {is_field_already_resolved('duration', updated_state)}")
    print(f"  is_field_already_resolved('photophobia'): {is_field_already_resolved('photophobia', updated_state)}")
    print(f"  is_field_already_resolved('open_headache_exploration'): {is_field_already_resolved('open_headache_exploration', updated_state)}")

    # Step 7: Domain & Candidate Scoring
    domains = classify_clinical_domains(updated_state, "GENERAL_CLINICAL")
    print(f"\nClassified domains: {domains}")
    
    past_questions = ["Hello! I am SwasthyaVaani, your AI health assistant. What main symptom or health concern brings you in today?"]
    asked_target_fields = set(updated_state.resolved_dimensions)
    
    print("\n--- 7. ASKED HISTORY / TARGET FIELD HISTORY ---")
    print(f"  past_questions: {past_questions}")
    print(f"  asked_target_fields: {asked_target_fields}")

    candidates = score_candidate_dimensions(domains, updated_state, past_questions, asked_target_fields)

    print("\n--- 8. TOP CANDIDATE SCORES AFTER TURN 1 ---")
    for idx, c in enumerate(candidates[:10]):
        resolved_flag = is_field_already_resolved(c['field_name'], updated_state)
        canon_known = updated_state.is_dimension_sufficiently_known(c['canonical_dimension'])
        print(f"  [{idx+1}] field={c['field_name']:<28} score={c['score']:<5} mode={c['reasoning_mode']:<20} resolved={resolved_flag} canon_known={canon_known} canon={c['canonical_dimension']}")

    viable_candidates = [
        c for c in candidates
        if not is_field_already_resolved(c["field_name"], updated_state) and c["score"] > 0
    ]
    print(f"\nViable candidates count (score > 0 and not resolved): {len(viable_candidates)}")
    for idx, c in enumerate(viable_candidates[:5]):
        print(f"  Viable [{idx+1}]: {c['field_name']} (score={c['score']}, mode={c['reasoning_mode']})")

    # Step 9 & 10: Adaptive Engine Decision
    decision = await evaluate_next_question(
        state=updated_state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=past_questions,
        consecutive_low_progress=0,
        total_questions_asked=1,
        language_code=language_code
    )

    print("\n--- 9. SELECTED TARGET FIELD ---")
    print(f"  decision.action: {decision.action}")
    print(f"  decision.target_field: {decision.target_field!r}")
    print(f"  decision.reasoning_mode: {decision.reasoning_mode!r}")
    print(f"  decision.reason: {decision.reason!r}")

    print("\n--- 10. EXACT BACKEND DECISION.QUESTION ---")
    print(f"  decision.question: {decision.question!r}")
    print("\n")

async def main():
    cases = [
        ("English Case 1 (Front)", "I have a headache in the front of my head.", "en"),
        ("Hindi Case 1 (Front)", "मुझे सिर के सामने वाले हिस्से में दर्द हो रहा है।", "hi"),
        ("English Case 2 (Right Side)", "I have a headache on the right side of my head.", "en"),
        ("Hindi Case 2 (Right Side)", "मेरे सिर के दाहिने तरफ दर्द हो रहा है।", "hi"),
    ]
    for name, text, lang in cases:
        await trace_case(name, text, lang)

if __name__ == "__main__":
    asyncio.run(main())
