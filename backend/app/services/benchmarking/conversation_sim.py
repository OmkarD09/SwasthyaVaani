"""
Conversation Simulator for SwasthyaVaani LLM Benchmarking.

Executes a complete multi-turn clinical conversation between a simulated patient persona
and the SwasthyaVaani intake workflow with explicit timing, state tracking, and transcript logging.
"""

import time
import traceback
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.clinical_state import ClinicalState, Medication, Provenance
from app.services.clinical_ai.adaptive_engine import evaluate_next_question
from app.services.benchmarking.metrics import TurnLatency
from app.services.benchmarking.scenarios import BenchmarkScenario, PatientPersonaTurn
from app.services.providers.base import AbstractLLMProvider
from app.services.safety.contradictions import detect_contradictions
from app.services.safety.red_flags import evaluate_red_flags


def _merge_extracted_facts_into_state(
    current_state: ClinicalState,
    extracted_facts: Dict[str, Any],
    raw_text: str,
    target_field: str,
    turn_index: int
) -> ClinicalState:
    """Replicates the production state-merging logic from app.api.v1.intakes."""
    updated_dict = current_state.model_dump()
    for k, v in extracted_facts.items():
        if v is not None:
            if k == "chief_complaint" and current_state.chief_complaint:
                continue
            if isinstance(v, list) and isinstance(updated_dict.get(k), list):
                updated_dict[k] = list(updated_dict[k])
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

    # Sync AYUSH core
    ayush_core = ["agni", "koshtha", "ahara_vihara"]
    for af in ayush_core:
        if af in extracted_facts and extracted_facts[af] is not None:
            from app.schemas.clinical_state import AyushState
            if not updated_state.ayush:
                updated_state.ayush = AyushState()
            setattr(updated_state.ayush, af, str(extracted_facts[af]))
            updated_state.set_canonical_dimension(af, "KNOWN_WITH_VALUE", value=str(extracted_facts[af]))

    # Sync Dashavidha
    dashavidha_fields = ["sara", "samhanana", "pramana", "satmya", "sattva", "ahara_shakti", "vyayama_shakti", "vaya"]
    for df in dashavidha_fields:
        if df in extracted_facts and extracted_facts[df] is not None:
            updated_state.set_canonical_dimension(df, "KNOWN_WITH_VALUE", value=str(extracted_facts[df]))

    # Handle explicit negation for vomiting
    indic_negated_vomiting_terms = {
        "vomiting", "vomit", "nausea", "ulti", "not vomiting", "no vomiting",
        "i am not vomiting", "without vomiting", "ulti nahi", "उलटी नाही", "उल्टी नहीं", "मळमळ नाही"
    }
    has_negated_vomit = any(
        str(ns).lower() in ["vomiting", "vomit", "nausea", "ulti", "उलटी", "उल्टी", "मळमळ"]
        or any(term in str(ns).lower() for term in indic_negated_vomiting_terms)
        for ns in updated_state.negated_symptoms
    ) or any(
        term in raw_text.lower()
        for term in ["no vomiting", "not vomiting", "i am not vomiting", "उलटी नाही", "उल्टी नहीं", "मळमळ नाही"]
    )

    if has_negated_vomit:
        existing_vomit = updated_state.canonical_dimensions.get("vomiting")
        if not existing_vomit or existing_vomit.status not in ["KNOWN_TRUE", "KNOWN_WITH_VALUE"]:
            updated_state.set_canonical_dimension("vomiting", "KNOWN_FALSE", value=False, turn=turn_index)
            if "vomiting" not in updated_state.negated_symptoms:
                updated_state.negated_symptoms.append("vomiting")
            updated_state.associated_symptoms = [
                s for s in updated_state.associated_symptoms
                if not any(t in str(s).lower() for t in ["vomiting", "vomit", "ulti", "उलटी", "उल्टी"])
            ]

    # Explicit negation for fever
    if any(term in raw_text.lower() for term in ["no fever", "fever nahi hai", "bukhar nahi hai", "ताप नाही"]):
        if "fever" not in updated_state.negated_symptoms:
            updated_state.negated_symptoms.append("fever")
            updated_state.set_canonical_dimension("fever", "KNOWN_FALSE", value=False, turn=turn_index)

    return updated_state


async def run_scenario_conversation(
    scenario: BenchmarkScenario,
    provider: AbstractLLMProvider,
    provider_name: str
) -> Dict[str, Any]:
    """
    Executes an isolated multi-turn clinical conversation simulation for a given scenario & provider.
    Returns the complete trajectory, final ClinicalState, transcripts, turn latencies, and error logs.
    """
    from app.services.providers.factory import provider_registry
    
    # Override the active provider in factory so evaluate_next_question uses it
    provider_registry.override_llm(provider)

    # 1. Initialize State with clean copy
    initial_dict = scenario.initial_clinical_state.copy() if scenario.initial_clinical_state else {}
    current_state = ClinicalState(**initial_dict)

    if scenario.initial_medications:
        for med in scenario.initial_medications:
            current_state.medications.append(Medication(**med))

    trajectory: List[Dict[str, Any]] = []
    formatted_transcript: List[Dict[str, str]] = []
    turn_latencies: List[TurnLatency] = []
    error_log: List[str] = []
    fallback_count = 0

    current_patient_input = scenario.initial_statement
    asked_questions_history: List[str] = []
    current_target_field = "chief_complaint"

    for turn_idx in range(scenario.max_turns):
        t_turn_start = time.perf_counter()

        # Log patient message in transcript
        formatted_transcript.append({
            "speaker": "Patient",
            "text": current_patient_input,
            "turn": turn_idx
        })

        # --- Phase A: Clinical Fact Extraction ---
        t_ext_start = time.perf_counter()
        extracted_facts: Dict[str, Any] = {}
        extraction_provider_reported = provider_name

        try:
            extraction_result = await provider.extract_clinical_facts(
                raw_text=current_patient_input,
                current_state=current_state,
                language_code=scenario.language_code,
                target_field=current_target_field
            )
            extracted_facts = dict(extraction_result.extracted_facts)
            extraction_provider_reported = extraction_result.provider_name
            
            # Detect fallback activation
            if "mock" in provider_name.lower():
                pass
            elif "mock" in extraction_provider_reported.lower():
                fallback_count += 1
                error_log.append(f"Turn {turn_idx}: Provider {provider_name} triggered Mock fallback.")

        except Exception as e:
            error_msg = f"Turn {turn_idx} Extraction Error: {str(e)}"
            error_log.append(error_msg)
            fallback_count += 1
            # Deterministic fallback on exception
            from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
            _, extracted_facts, _ = extract_clinical_facts_from_answer(current_patient_input, current_target_field, current_state)

        t_ext_end = time.perf_counter()
        ext_ms = (t_ext_end - t_ext_start) * 1000.0

        # --- Phase B: Merge Extracted Facts into State ---
        current_state = _merge_extracted_facts_into_state(
            current_state=current_state,
            extracted_facts=extracted_facts,
            raw_text=current_patient_input,
            target_field=current_target_field,
            turn_index=turn_idx + 1
        )

        # --- Phase C: Deterministic Safety Layer ---
        current_state.red_flags = evaluate_red_flags(current_state)
        current_state.contradictions = detect_contradictions(current_state)

        # --- Phase D: Adaptive Next Question Decision ---
        t_gen_start = time.perf_counter()
        decision_action = "STOP"
        ai_question = ""
        decision_reason = ""
        decision_target_field = ""

        try:
            decision = await evaluate_next_question(
                state=current_state,
                workflow_type=scenario.workflow_type,
                asked_questions=asked_questions_history,
                consecutive_low_progress=0,
                total_questions_asked=turn_idx + 1,
                language_code=scenario.language_code,
                db=None
            )
            decision_action = decision.action
            ai_question = decision.question or ""
            decision_reason = decision.reason or ""
            decision_target_field = decision.target_field or ""

        except Exception as e:
            error_msg = f"Turn {turn_idx} Question Decision Error: {str(e)}"
            error_log.append(error_msg)
            decision_action = "STOP"
            decision_reason = f"Error in engine: {str(e)}"

        t_gen_end = time.perf_counter()
        gen_ms = (t_gen_end - t_gen_start) * 1000.0
        turn_total_ms = (time.perf_counter() - t_turn_start) * 1000.0

        turn_latencies.append(TurnLatency(
            turn=turn_idx + 1,
            extraction_ms=round(ext_ms, 2),
            question_generation_ms=round(gen_ms, 2),
            turn_total_ms=round(turn_total_ms, 2)
        ))

        # Record trajectory item
        trajectory.append({
            "turn": turn_idx + 1,
            "patient_input": current_patient_input,
            "target_field_answered": current_target_field,
            "extracted_facts": extracted_facts,
            "extraction_provider": extraction_provider_reported,
            "extraction_latency_ms": round(ext_ms, 2),
            "action": decision_action,
            "ai_question": ai_question,
            "next_target_field": decision_target_field,
            "generation_latency_ms": round(gen_ms, 2),
            "reason": decision_reason,
            "red_flags_fired": [rf.rule_id for rf in current_state.red_flags],
            "contradictions_detected": len(current_state.contradictions),
        })

        if decision_action == "ASK" and ai_question:
            asked_questions_history.append(ai_question)
            formatted_transcript.append({
                "speaker": "SwasthyaVaani AI",
                "text": ai_question,
                "target_field": decision_target_field,
                "turn": turn_idx + 1
            })

            # Check if simulation should continue to next turn
            if turn_idx < len(scenario.persona_responses):
                persona_turn: PatientPersonaTurn = scenario.persona_responses[turn_idx]
                # Look up response for the specific target field asked
                if decision_target_field and decision_target_field in persona_turn.target_field_answers:
                    current_patient_input = persona_turn.target_field_answers[decision_target_field]
                else:
                    current_patient_input = persona_turn.default_response
                current_target_field = decision_target_field
            else:
                # No more scripted responses available
                break
        else:
            # STOP or ESCALATE
            formatted_transcript.append({
                "speaker": "System",
                "text": f"[{decision_action}] {decision_reason}",
                "turn": turn_idx + 1
            })
            break

    return {
        "scenario_id": scenario.id,
        "provider_name": provider_name,
        "final_state": current_state,
        "trajectory": trajectory,
        "transcript": formatted_transcript,
        "turn_latencies": turn_latencies,
        "error_log": error_log,
        "fallback_count": fallback_count,
    }
