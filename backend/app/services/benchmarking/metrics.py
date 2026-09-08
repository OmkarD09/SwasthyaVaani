"""
Metrics and Evaluation Engine for SwasthyaVaani LLM Benchmarking.

Computes:
1. Extraction Accuracy (Precision, Recall, F1 across SOCRATES & AYUSH fields)
2. Question Relevance Rate
3. Question Redundancy Rate
4. Conversation Efficiency (yield per question, sufficiency achievement)
5. Safety Behavior & Explicit Attribution (Model Extraction vs Deterministic System Rules)
6. Contradiction Detection
7. AYUSH Specific Extraction
8. Language-Specific Performance
9. Latency Breakdown (Per-turn, extraction, generation, total)
10. Reliability (Error rate, fallback rate, timeouts)
11. Transparent Composite Score (with Safety Gating)
"""

import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.clinical_state import ClinicalState
from app.services.benchmarking.scenarios import BenchmarkScenario, ExpectedFacts


class TurnLatency(BaseModel):
    turn: int
    extraction_ms: float = 0.0
    question_generation_ms: float = 0.0
    turn_total_ms: float = 0.0


class ScenarioMetrics(BaseModel):
    scenario_id: str
    scenario_code: str
    scenario_title: str
    provider_name: str
    language_code: str
    
    # 1. Extraction Metrics
    extraction_precision: float = 0.0
    extraction_recall: float = 0.0
    extraction_f1: float = 0.0
    matched_facts: List[str] = Field(default_factory=list)
    missing_facts: List[str] = Field(default_factory=list)
    spurious_facts: List[str] = Field(default_factory=list)
    
    # 2. Question Quality
    total_questions_generated: int = 0
    relevant_questions_count: int = 0
    relevant_question_rate: float = 0.0
    redundant_questions_count: int = 0
    redundant_question_rate: float = 0.0
    
    # 3. Conversation Efficiency
    total_turns: int = 0
    useful_information_obtained: int = 0
    efficiency_yield: float = 0.0  # useful facts / turns
    sufficiency_achieved: bool = False
    stop_reason: Optional[str] = None
    
    # 4. Safety & Attribution
    model_extracted_safety_markers: bool = False
    system_safety_red_flags_fired: List[str] = Field(default_factory=list)
    safety_gating_passed: bool = True
    safety_attribution_summary: str = ""
    
    # 5. Contradiction Handling
    expected_contradictions: int = 0
    detected_contradictions: int = 0
    contradiction_handling_passed: bool = True
    
    # 6. AYUSH Specifics
    is_ayush_scenario: bool = False
    ayush_extraction_accuracy: float = 0.0
    ayush_matched_fields: List[str] = Field(default_factory=list)
    
    # 7. Latency Breakdown
    turn_latencies: List[TurnLatency] = Field(default_factory=list)
    avg_turn_latency_ms: float = 0.0
    avg_extraction_latency_ms: float = 0.0
    avg_generation_latency_ms: float = 0.0
    total_conversation_latency_ms: float = 0.0
    
    # 8. Reliability
    api_errors: int = 0
    timeouts: int = 0
    fallback_invocations: int = 0
    successful_completion: bool = True
    error_messages: List[str] = Field(default_factory=list)
    
    # 9. Overall Composite Score (0.0 to 100.0)
    composite_score: float = 0.0
    score_breakdown: Dict[str, float] = Field(default_factory=dict)


class ProviderAggregateMetrics(BaseModel):
    provider_name: str
    total_runs: int = 0
    scenarios_evaluated: int = 0
    
    # Averages
    mean_extraction_f1: float = 0.0
    mean_relevant_question_rate: float = 0.0
    mean_redundant_question_rate: float = 0.0
    mean_questions_per_conversation: float = 0.0
    mean_efficiency_yield: float = 0.0
    
    # Language Performance
    english_f1: float = 0.0
    hindi_f1: float = 0.0
    hinglish_f1: float = 0.0
    
    # Safety & Contradiction
    safety_pass_rate: float = 0.0
    contradiction_pass_rate: float = 0.0
    ayush_accuracy: float = 0.0
    
    # Latency & Reliability
    avg_latency_ms: float = 0.0
    avg_extraction_latency_ms: float = 0.0
    avg_generation_latency_ms: float = 0.0
    total_api_errors: int = 0
    total_fallback_invocations: int = 0
    reliability_rate: float = 0.0  # (successes / total runs)
    
    # Composite Score
    overall_composite_score: float = 0.0
    all_safety_gates_passed: bool = True


# ---------------------------------------------------------------------------
# Metric Evaluation Functions
# ---------------------------------------------------------------------------

def _normalize_str(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"[^\w\s]", "", str(s).lower()).strip()


def _fuzzy_match(expected: str, actual: str) -> bool:
    exp_norm = _normalize_str(expected)
    act_norm = _normalize_str(actual)
    if not exp_norm or not act_norm:
        return False
    if exp_norm in act_norm or act_norm in exp_norm:
        return True
    # Word overlap check
    exp_words = set(exp_norm.split())
    act_words = set(act_norm.split())
    if exp_words and act_words:
        overlap = len(exp_words.intersection(act_words)) / min(len(exp_words), len(act_words))
        if overlap >= 0.6:
            return True
    return False


def _check_duration_match(expected: Optional[str], actual: Optional[str]) -> bool:
    if not expected or not actual:
        return False
    exp_n = _normalize_str(expected)
    act_n = _normalize_str(actual)
    
    # Standard equivalence mapping
    if ("2 day" in exp_n or "two day" in exp_n or "do din" in exp_n) and any(x in act_n for x in ["2", "two", "do din", "2 day", "2 days"]):
        return True
    if ("3 day" in exp_n or "three day" in exp_n or "teen din" in exp_n) and any(x in act_n for x in ["3", "three", "teen", "3 day", "3 days"]):
        return True
    if ("yesterday" in exp_n or "kal" in exp_n) and ("yesterday" in act_n or "kal" in act_n or "1 day" in act_n):
        return True
    if ("2 week" in exp_n or "two week" in exp_n) and any(x in act_n for x in ["2 week", "two week", "14 day", "2 weeks"]):
        return True
    if ("4 day" in exp_n or "four day" in exp_n) and any(x in act_n for x in ["4", "four", "4 day", "4 days"]):
        return True
        
    return _fuzzy_match(expected, actual)


def calculate_scenario_metrics(
    scenario: BenchmarkScenario,
    provider_name: str,
    final_state: ClinicalState,
    conversation_trajectory: List[Dict[str, Any]],
    turn_latencies: List[TurnLatency],
    error_log: List[str],
    fallback_count: int,
) -> ScenarioMetrics:
    """Evaluates full clinical metrics for a single scenario run."""
    expected = scenario.expected_facts
    matched_facts: List[str] = []
    missing_facts: List[str] = []
    spurious_facts: List[str] = []

    # 1. Evaluate Chief Complaint
    if expected.chief_complaint:
        if final_state.chief_complaint and _fuzzy_match(expected.chief_complaint, final_state.chief_complaint):
            matched_facts.append(f"chief_complaint: {final_state.chief_complaint}")
        else:
            missing_facts.append(f"chief_complaint: expected '{expected.chief_complaint}', got '{final_state.chief_complaint}'")

    # 2. Evaluate Duration
    if expected.duration:
        if final_state.duration and _check_duration_match(expected.duration, final_state.duration):
            matched_facts.append(f"duration: {final_state.duration}")
        else:
            missing_facts.append(f"duration: expected '{expected.duration}', got '{final_state.duration}'")

    # 3. Evaluate Severity
    if expected.severity is not None:
        if final_state.severity is not None and abs(final_state.severity - expected.severity) <= 1:
            matched_facts.append(f"severity: {final_state.severity} (expected {expected.severity})")
        else:
            missing_facts.append(f"severity: expected {expected.severity}, got {final_state.severity}")

    # 4. Evaluate Location / Distribution
    if expected.location:
        state_loc = final_state.location or ""
        if state_loc and _fuzzy_match(expected.location, state_loc):
            matched_facts.append(f"location: {state_loc}")
        else:
            missing_facts.append(f"location: expected '{expected.location}', got '{state_loc}'")

    # 5. Evaluate Radiation
    if expected.radiation:
        state_rad = final_state.radiation or ""
        if state_rad and _fuzzy_match(expected.radiation, state_rad):
            matched_facts.append(f"radiation: {state_rad}")
        else:
            missing_facts.append(f"radiation: expected '{expected.radiation}', got '{state_rad}'")

    # 6. Evaluate Character
    if expected.character:
        state_char = final_state.character or ""
        if state_char and _fuzzy_match(expected.character, state_char):
            matched_facts.append(f"character: {state_char}")
        else:
            missing_facts.append(f"character: expected '{expected.character}', got '{state_char}'")

    # 7. Evaluate Associated Symptoms
    for exp_sym in expected.associated_symptoms:
        found = False
        all_syms = final_state.associated_symptoms + final_state.symptoms + ([final_state.dizziness] if final_state.dizziness else [])
        for act_sym in all_syms:
            if act_sym and _fuzzy_match(exp_sym, str(act_sym)):
                found = True
                break
        if found:
            matched_facts.append(f"associated_symptom: {exp_sym}")
        else:
            missing_facts.append(f"associated_symptom: {exp_sym}")

    # 8. Evaluate Negated Symptoms
    for exp_neg in expected.negated_symptoms:
        found = False
        for act_neg in final_state.negated_symptoms:
            if act_neg and _fuzzy_match(exp_neg, str(act_neg)):
                found = True
                break
        if found:
            matched_facts.append(f"negated_symptom: {exp_neg}")
        else:
            missing_facts.append(f"negated_symptom: {exp_neg}")

    # 9. Evaluate AYUSH Fields
    is_ayush = scenario.workflow_type == "AYUSH" or bool(expected.agni or expected.koshtha or expected.ahara_vihara)
    ayush_matched: List[str] = []
    ayush_total = 0
    if expected.agni:
        ayush_total += 1
        act_agni = (final_state.ayush.agni if final_state.ayush else None) or (
            final_state.canonical_dimensions.get("agni").value if final_state.canonical_dimensions.get("agni") else None
        )
        if act_agni and _fuzzy_match(expected.agni, str(act_agni)):
            matched_facts.append(f"ayush_agni: {act_agni}")
            ayush_matched.append("agni")
        else:
            missing_facts.append(f"ayush_agni: expected '{expected.agni}', got '{act_agni}'")

    if expected.koshtha:
        ayush_total += 1
        act_koshtha = (final_state.ayush.koshtha if final_state.ayush else None) or (
            final_state.canonical_dimensions.get("koshtha").value if final_state.canonical_dimensions.get("koshtha") else None
        )
        if act_koshtha and _fuzzy_match(expected.koshtha, str(act_koshtha)):
            matched_facts.append(f"ayush_koshtha: {act_koshtha}")
            ayush_matched.append("koshtha")
        else:
            missing_facts.append(f"ayush_koshtha: expected '{expected.koshtha}', got '{act_koshtha}'")

    if expected.ahara_vihara:
        ayush_total += 1
        act_av = (final_state.ayush.ahara_vihara if final_state.ayush else None) or (
            final_state.canonical_dimensions.get("ahara_vihara").value if final_state.canonical_dimensions.get("ahara_vihara") else None
        )
        if act_av and _fuzzy_match(expected.ahara_vihara, str(act_av)):
            matched_facts.append(f"ayush_ahara_vihara: {act_av}")
            ayush_matched.append("ahara_vihara")
        else:
            missing_facts.append(f"ayush_ahara_vihara: expected '{expected.ahara_vihara}', got '{act_av}'")

    ayush_accuracy = (len(ayush_matched) / ayush_total) if ayush_total > 0 else 1.0

    # Calculate Precision, Recall, F1
    total_expected = len(matched_facts) + len(missing_facts)
    total_extracted = len(matched_facts) + len(spurious_facts)
    recall = (len(matched_facts) / total_expected) if total_expected > 0 else 1.0
    precision = (len(matched_facts) / total_extracted) if total_extracted > 0 else 1.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    # 10. Question Relevance & Redundancy Analysis
    questions = [t for t in conversation_trajectory if t.get("ai_question")]
    total_questions = len(questions)
    relevant_count = 0
    redundant_count = 0
    asked_targets: List[str] = []

    for q in questions:
        target = q.get("target_field") or ""
        q_text = str(q.get("ai_question") or "").lower()

        # Check redundancy
        is_redundant = False
        if target and target in asked_targets:
            is_redundant = True
        elif target in ["duration", "symptom_duration"] and final_state.duration and ("how long" in q_text or "kitne din" in q_text):
            is_redundant = True
        elif target in ["past_history", "medications"] and scenario.initial_clinical_state and target in scenario.initial_clinical_state.get("resolved_dimensions", []):
            is_redundant = True

        if is_redundant:
            redundant_count += 1
        else:
            # Check irrelevance
            is_irrelevant = False
            for irr in scenario.irrelevant_dimensions:
                if irr in target or irr.replace("_", " ") in q_text:
                    is_irrelevant = True
                    break
            if not is_irrelevant:
                relevant_count += 1

        if target:
            asked_targets.append(target)

    rel_rate = (relevant_count / total_questions) if total_questions > 0 else 1.0
    red_rate = (redundant_count / total_questions) if total_questions > 0 else 0.0

    # 11. Efficiency Calculation
    total_turns = len(conversation_trajectory)
    useful_info = len(matched_facts)
    efficiency_yield = (useful_info / max(1, total_turns))
    last_turn = conversation_trajectory[-1] if conversation_trajectory else {}
    sufficiency_achieved = last_turn.get("action") == "STOP" or "sufficient" in str(last_turn.get("reason", "")).lower()

    # 12. Safety & Attribution Analysis
    fired_red_flags = [rf.rule_id for rf in final_state.red_flags]
    expected_red_flags = scenario.expected_safety.expected_red_flags
    
    # Check if model extracted the safety markers
    model_extracted_safety = True
    if "RF-CP-001" in expected_red_flags:
        has_cp = final_state.chief_complaint and "chest" in final_state.chief_complaint.lower()
        has_rad = final_state.radiation and "arm" in final_state.radiation.lower()
        model_extracted_safety = bool(has_cp and has_rad)

    # Check if deterministic rule fired
    system_rules_matched = all(rf in fired_red_flags for rf in expected_red_flags)
    safety_gating_passed = system_rules_matched and (model_extracted_safety or not expected_red_flags)

    attribution_summary = (
        f"Provider Extracted Safety Markers: {model_extracted_safety} | "
        f"Deterministic Rules Fired: {fired_red_flags} (Expected: {expected_red_flags})"
    )

    # 13. Contradiction Handling
    expected_contradictions = scenario.expected_safety.expected_contradictions_count
    actual_contradictions = len(final_state.contradictions)
    contradiction_passed = (actual_contradictions >= expected_contradictions) if expected_contradictions > 0 else True

    # 14. Latency Analysis
    total_lat = sum(t.turn_total_ms for t in turn_latencies)
    avg_turn_lat = (total_lat / len(turn_latencies)) if turn_latencies else 0.0
    avg_ext_lat = (sum(t.extraction_ms for t in turn_latencies) / len(turn_latencies)) if turn_latencies else 0.0
    avg_gen_lat = (sum(t.question_generation_ms for t in turn_latencies) / len(turn_latencies)) if turn_latencies else 0.0

    # 15. Reliability
    api_errs = len([e for e in error_log if "error" in e.lower() or "500" in e or "400" in e])
    timeouts = len([e for e in error_log if "timeout" in e.lower()])
    successful_completion = (api_errs == 0 and timeouts == 0)

    # 16. Composite Score Computation (0 - 100)
    # Weights: 30% Extraction F1, 25% Question Relevance, 15% Efficiency, 10% Language, 10% Reliability, 10% Latency
    norm_latency_score = max(0.0, min(1.0, 1.0 - (avg_turn_lat / 4000.0)))
    norm_reliability_score = 1.0 if successful_completion else 0.5
    norm_efficiency_score = min(1.0, efficiency_yield / 2.0)
    norm_relevance_score = max(0.0, rel_rate - (red_rate * 0.5))

    score_components = {
        "extraction_f1": f1 * 30.0,
        "question_relevance": norm_relevance_score * 25.0,
        "conversation_efficiency": norm_efficiency_score * 15.0,
        "language_handling": f1 * 10.0,
        "reliability": norm_reliability_score * 10.0,
        "latency": norm_latency_score * 10.0,
    }
    raw_composite = sum(score_components.values())
    
    # Safety gating penalty if critical safety scenario failed
    if scenario.expected_safety.safety_gating_required and not safety_gating_passed:
        raw_composite = min(raw_composite, 40.0)

    return ScenarioMetrics(
        scenario_id=scenario.id,
        scenario_code=scenario.code,
        scenario_title=scenario.title,
        provider_name=provider_name,
        language_code=scenario.language_code,
        extraction_precision=round(precision, 4),
        extraction_recall=round(recall, 4),
        extraction_f1=round(f1, 4),
        matched_facts=matched_facts,
        missing_facts=missing_facts,
        spurious_facts=spurious_facts,
        total_questions_generated=total_questions,
        relevant_questions_count=relevant_count,
        relevant_question_rate=round(rel_rate, 4),
        redundant_questions_count=redundant_count,
        redundant_question_rate=round(red_rate, 4),
        total_turns=total_turns,
        useful_information_obtained=useful_info,
        efficiency_yield=round(efficiency_yield, 4),
        sufficiency_achieved=sufficiency_achieved,
        stop_reason=last_turn.get("reason"),
        model_extracted_safety_markers=model_extracted_safety,
        system_safety_red_flags_fired=fired_red_flags,
        safety_gating_passed=safety_gating_passed,
        safety_attribution_summary=attribution_summary,
        expected_contradictions=expected_contradictions,
        detected_contradictions=actual_contradictions,
        contradiction_handling_passed=contradiction_passed,
        is_ayush_scenario=is_ayush,
        ayush_extraction_accuracy=round(ayush_accuracy, 4),
        ayush_matched_fields=ayush_matched,
        turn_latencies=turn_latencies,
        avg_turn_latency_ms=round(avg_turn_lat, 2),
        avg_extraction_latency_ms=round(avg_ext_lat, 2),
        avg_generation_latency_ms=round(avg_gen_lat, 2),
        total_conversation_latency_ms=round(total_lat, 2),
        api_errors=api_errs,
        timeouts=timeouts,
        fallback_invocations=fallback_count,
        successful_completion=successful_completion,
        error_messages=error_log,
        composite_score=round(raw_composite, 2),
        score_breakdown={k: round(v, 2) for k, v in score_components.items()}
    )


def aggregate_provider_metrics(
    provider_name: str,
    scenario_metrics_list: List[ScenarioMetrics]
) -> ProviderAggregateMetrics:
    """Aggregates multiple scenario metrics across repeated runs for a single provider."""
    if not scenario_metrics_list:
        return ProviderAggregateMetrics(provider_name=provider_name)

    n = len(scenario_metrics_list)
    mean_f1 = sum(m.extraction_f1 for m in scenario_metrics_list) / n
    mean_rel_rate = sum(m.relevant_question_rate for m in scenario_metrics_list) / n
    mean_red_rate = sum(m.redundant_question_rate for m in scenario_metrics_list) / n
    mean_questions = sum(m.total_questions_generated for m in scenario_metrics_list) / n
    mean_eff = sum(m.efficiency_yield for m in scenario_metrics_list) / n

    # Language breakdown
    en_runs = [m for m in scenario_metrics_list if m.language_code == "en"]
    hi_runs = [m for m in scenario_metrics_list if m.language_code == "hi"]
    hinglish_runs = [m for m in scenario_metrics_list if "hinglish" in m.scenario_id]

    en_f1 = (sum(m.extraction_f1 for m in en_runs) / len(en_runs)) if en_runs else 0.0
    hi_f1 = (sum(m.extraction_f1 for m in hi_runs) / len(hi_runs)) if hi_runs else 0.0
    hinglish_f1 = (sum(m.extraction_f1 for m in hinglish_runs) / len(hinglish_runs)) if hinglish_runs else 0.0

    # Safety, Contradiction, AYUSH
    safety_passes = sum(1 for m in scenario_metrics_list if m.safety_gating_passed)
    safety_rate = safety_passes / n

    contra_runs = [m for m in scenario_metrics_list if m.expected_contradictions > 0]
    contra_passes = sum(1 for m in contra_runs if m.contradiction_handling_passed)
    contra_rate = (contra_passes / len(contra_runs)) if contra_runs else 1.0

    ayush_runs = [m for m in scenario_metrics_list if m.is_ayush_scenario]
    ayush_acc = (sum(m.ayush_extraction_accuracy for m in ayush_runs) / len(ayush_runs)) if ayush_runs else 1.0

    # Latencies
    avg_lat = sum(m.avg_turn_latency_ms for m in scenario_metrics_list) / n
    avg_ext_lat = sum(m.avg_extraction_latency_ms for m in scenario_metrics_list) / n
    avg_gen_lat = sum(m.avg_generation_latency_ms for m in scenario_metrics_list) / n

    total_errors = sum(m.api_errors for m in scenario_metrics_list)
    total_fallbacks = sum(m.fallback_invocations for m in scenario_metrics_list)
    successes = sum(1 for m in scenario_metrics_list if m.successful_completion)
    reliability = successes / n

    mean_composite = sum(m.composite_score for m in scenario_metrics_list) / n

    return ProviderAggregateMetrics(
        provider_name=provider_name,
        total_runs=n,
        scenarios_evaluated=len(set(m.scenario_id for m in scenario_metrics_list)),
        mean_extraction_f1=round(mean_f1, 4),
        mean_relevant_question_rate=round(mean_rel_rate, 4),
        mean_redundant_question_rate=round(mean_red_rate, 4),
        mean_questions_per_conversation=round(mean_questions, 2),
        mean_efficiency_yield=round(mean_eff, 4),
        english_f1=round(en_f1, 4),
        hindi_f1=round(hi_f1, 4),
        hinglish_f1=round(hinglish_f1, 4),
        safety_pass_rate=round(safety_rate, 4),
        contradiction_pass_rate=round(contra_rate, 4),
        ayush_accuracy=round(ayush_acc, 4),
        avg_latency_ms=round(avg_lat, 2),
        avg_extraction_latency_ms=round(avg_ext_lat, 2),
        avg_generation_latency_ms=round(avg_gen_lat, 2),
        total_api_errors=total_errors,
        total_fallback_invocations=total_fallbacks,
        reliability_rate=round(reliability, 4),
        overall_composite_score=round(mean_composite, 2),
        all_safety_gates_passed=(safety_passes == n)
    )
