import logging
from typing import List, Optional, Any, Set, Tuple, Dict
from sqlalchemy.orm import Session

from app.schemas.clinical_state import ClinicalState
from app.schemas.question import QuestionDecision
from app.services.clinical_ai.gap_analysis import find_information_gaps
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.question_scorer import (
    score_candidate_dimensions,
    is_field_already_resolved,
    MAP_TO_CANONICAL,
    SEMANTIC_CLUSTERS
)
from app.services.safety.red_flags import evaluate_red_flags
from app.services.safety.contradictions import detect_contradictions
from app.core.config import settings
from app.services.providers.factory import get_llm_service
from app.services.rag.rag_service import rag_service

logger = logging.getLogger(__name__)


def is_semantic_duplicate(candidate: str, asked_questions: List[str]) -> bool:
    """Checks whether a candidate question is redundantly similar to previously asked questions."""
    cand_norm = candidate.lower().replace("?", "").replace(".", "").replace("—", "").strip()
    for prev in asked_questions:
        prev_norm = prev.lower().replace("?", "").replace(".", "").replace("—", "").strip()
        if cand_norm == prev_norm:
            return True
        cand_words = set(cand_norm.split())
        prev_words = set(prev_norm.split())
        if len(cand_words) > 0 and len(prev_words) > 0:
            overlap = len(cand_words.intersection(prev_words)) / max(len(cand_words), len(prev_words))
            if overlap > 0.65:
                return True
    return False


def _assess_information_sufficiency(
    state: ClinicalState,
    primary_domain: str,
    viable_candidates: List[Dict[str, Any]],
    total_questions_asked: int
) -> Tuple[bool, Optional[str]]:
    """
    Evaluates clinical information sufficiency across the complete ClinicalState:
    "Is there still clinically meaningful information that could change the doctor's understanding of this case?"
    
    Returns (is_sufficient: bool, reason: Optional[str])
    """
    if not viable_candidates:
        return True, "Minimum Sufficient History: All relevant clinical dimensions for this complaint are resolved."

    snippets = " ".join(state.raw_transcript_snippets + [state.chief_complaint or ""]).lower()
    has_cc = bool(state.chief_complaint)
    has_dur = is_field_already_resolved("duration", state)

    # 1. Safety Dimensions MUST NEVER be terminated early if unaddressed
    if any(c.get("reasoning_mode") == "SAFETY_REQUIRED" for c in viable_candidates[:3]):
        return False, None

    # 2. Check active clinical symptom complications that MUST be characterized before stopping
    has_vomiting = (
        "vomiting" in state.associated_symptoms 
        or "Vomiting" in state.associated_symptoms
        or any(w in snippets for w in ["vomit", "ulti"])
    ) and "vomiting" not in state.negated_symptoms

    has_diarrhea = (
        "diarrhea" in state.associated_symptoms
        or any(w in snippets for w in ["diarrhea", "dast", "loose motion", "watery"])
    ) and "diarrhea" not in state.negated_symptoms

    has_dark_stool = bool(state.dark_stool) or any(w in snippets for w in ["dark stool", "black stool", "kala dast", "kala sandas"])

    # If acute vomiting is active, fluid tolerance / hydration_status MUST be known before stopping
    if has_vomiting and not is_field_already_resolved("hydration_status", state):
        return False, None

    # If melena is active, onset and consistency MUST be known before stopping
    if has_dark_stool and not (is_field_already_resolved("dark_stool_onset", state) and is_field_already_resolved("dark_stool_consistency", state)):
        return False, None

    # If diarrhea is active, consistency MUST be known before stopping
    if has_diarrhea and not is_field_already_resolved("stool_consistency", state):
        return False, None

    # 3. Domain-Specific Clinical Sufficiency Checks
    if has_cc and has_dur:
        # A. Ophthalmic Presentation Sufficiency
        if primary_domain == ClinicalDomain.OPHTHALMIC:
            has_vision = is_field_already_resolved("blurred_vision", state)
            has_watering = is_field_already_resolved("eye_watering", state)
            has_light = is_field_already_resolved("light_sensitivity", state)
            has_discharge = is_field_already_resolved("eye_discharge", state)
            has_laterality = is_field_already_resolved("eye_laterality", state)
            has_neg_exp = "other_symptoms" in state.negated_symptoms
            
            if (has_vision and (has_watering or has_light or has_discharge or total_questions_asked >= 3)) or (has_neg_exp and has_laterality):
                return True, "Minimum Sufficient History: Information sufficient for Ophthalmic presentation: redness, duration, visual acuity, and associated ocular symptoms characterized."

        # B. GI Presentation Sufficiency
        elif primary_domain == ClinicalDomain.GASTROINTESTINAL:
            # Active Vomiting/Gastroenteritis
            if has_vomiting or has_diarrhea:
                has_food = is_field_already_resolved("food_exposure", state)
                has_hydration = is_field_already_resolved("hydration_status", state)
                has_bowel_known = (
                    is_field_already_resolved("stool_frequency", state)
                    or is_field_already_resolved("stool_consistency", state)
                    or is_field_already_resolved("open_gi_exploration", state)
                    or "other_symptoms" in state.negated_symptoms
                    or "diarrhea" in state.negated_symptoms
                )
                if has_food and has_hydration and has_bowel_known:
                    return True, "Minimum Sufficient History: Information sufficient for Acute Gastroenteritis: duration, food exposure, vomiting, and hydration status characterized."
            # Melena / GI Bleeding
            elif has_dark_stool:
                if is_field_already_resolved("dark_stool_onset", state) and is_field_already_resolved("dark_stool_consistency", state):
                    return True, "Minimum Sufficient History: Information sufficient for Melena presentation: onset and stool consistency characterized."
            # Isolated Acidity / GERD
            else:
                has_open_exp = is_field_already_resolved("open_gi_exploration", state) or "other_symptoms" in state.negated_symptoms
                has_upper_detail = (
                    is_field_already_resolved("meal_relationship", state)
                    or is_field_already_resolved("antacid_relief", state)
                    or len(state.aggravating_factors) > 0
                    or len(state.relieving_factors) > 0
                )
                if has_open_exp or (has_upper_detail and total_questions_asked >= 3):
                    return True, "Minimum Sufficient History: Information sufficient for Acidity/GERD presentation: complaint, duration, and upper GI profile characterized."

        # C. Headache Presentation Sufficiency
        elif primary_domain == ClinicalDomain.HEADACHE:
            has_dist = is_field_already_resolved("distribution", state) or is_field_already_resolved("location", state)
            has_photo = is_field_already_resolved("photophobia", state)
            has_neg_exploration = "other_symptoms" in state.negated_symptoms
            if has_photo or (has_dist and has_neg_exploration):
                return True, "Minimum Sufficient History: Information sufficient for Headache presentation: duration, lateralization, and photophobia characterized."

        # D. Respiratory Presentation Sufficiency
        elif primary_domain == ClinicalDomain.RESPIRATORY:
            has_cough = is_field_already_resolved("cough_type", state)
            has_breath = is_field_already_resolved("breathlessness", state)
            has_neg_exp = "other_symptoms" in state.negated_symptoms
            if has_cough or (has_breath and has_neg_exp):
                return True, "Minimum Sufficient History: Information sufficient for Respiratory presentation: cough type and breathlessness characterized."

        # E. Fever Presentation Sufficiency
        elif primary_domain == ClinicalDomain.FEVER:
            if is_field_already_resolved("fever_pattern", state) or "other_symptoms" in state.negated_symptoms:
                return True, "Minimum Sufficient History: Information sufficient for Fever presentation: duration and pattern characterized."

        # F. Cardiac Presentation Sufficiency
        elif primary_domain == ClinicalDomain.CARDIAC:
            has_rad = is_field_already_resolved("radiation", state)
            has_char = is_field_already_resolved("character", state)
            if has_rad or has_char:
                return True, "Minimum Sufficient History: Information sufficient for Cardiac presentation: radiation and chest discomfort character evaluated."

        # G. Urinary Presentation Sufficiency
        elif primary_domain == ClinicalDomain.URINARY:
            has_dysuria = is_field_already_resolved("dysuria_burning", state)
            has_freq = is_field_already_resolved("urinary_frequency", state)
            if has_dysuria or has_freq:
                return True, "Minimum Sufficient History: Information sufficient for Urinary tract presentation: duration and dysuria/frequency characterized."

        # H. Dermatology Presentation Sufficiency
        elif primary_domain == ClinicalDomain.DERMATOLOGY:
            has_itch = is_field_already_resolved("itching_pruritus", state)
            has_loc = is_field_already_resolved("location", state)
            if has_itch or has_loc:
                return True, "Minimum Sufficient History: Information sufficient for Dermatology presentation: rash location, duration, and pruritus characterized."

        # I. Musculoskeletal Presentation Sufficiency
        elif primary_domain == ClinicalDomain.MUSCULOSKELETAL:
            has_loc = is_field_already_resolved("location", state)
            has_swelling_or_trauma = is_field_already_resolved("swelling_warmth", state) or is_field_already_resolved("injury_history", state) or "other_symptoms" in state.negated_symptoms
            if has_loc or has_swelling_or_trauma:
                return True, "Minimum Sufficient History: Information sufficient for Musculoskeletal presentation: location, duration, and joint mobility characterized."

    # 4. If Open Exploration or High-Yield Targeted Dimension (score >= 65) is pending, don't stop
    top_candidate = viable_candidates[0]
    top_score = top_candidate.get("score", 0)
    top_mode = top_candidate.get("reasoning_mode", "TARGETED_FOLLOW_UP")

    if top_mode in ["SAFETY_REQUIRED", "OPEN_EXPLORATION"]:
        return False, None

    # If any high-gain clinical dimension remains unresolved, do not terminate
    if top_score >= 65:
        return False, None

    # If duration is missing, we must ask duration
    if not has_dur:
        return False, None

    # If only low-gain details (score < 65) remain and core history is established:
    if has_cc and (has_dur or total_questions_asked >= 4):
        return True, f"Minimum Sufficient History: Information sufficient for {primary_domain} presentation (no high-yield clinical gaps remain)."

    return False, None


async def evaluate_next_question(
    state: ClinicalState,
    workflow_type: str = "GENERAL_CLINICAL",
    asked_questions: Optional[List[str]] = None,
    consecutive_low_progress: int = 0,
    total_questions_asked: int = 0,
    language_code: str = "en",
    db: Optional[Session] = None
) -> QuestionDecision:
    """
    Domain-Aware, Information-Gain Scored Adaptive Clinical Engine.
    Dynamically identifies clinical domain, prunes irrelevant/negated dimensions,
    prevents semantic duplicates, scores candidates on clinical information gain,
    and applies early stopping for minimum sufficient history.
    """
    asked_questions = asked_questions or []
    lang = "hi" if language_code.startswith("hi") else "mr" if language_code.startswith("mr") else "en"

    # 1. Deterministic Safety Evaluation First
    red_flags = evaluate_red_flags(state)
    state.red_flags = red_flags
    state.contradictions = detect_contradictions(state)

    # 2. Guardrail E: Emergency Safety Limit Brake (MAX_QUESTIONS = 10)
    max_questions = getattr(settings, "MAX_QUESTIONS_DEFAULT", 10)
    if total_questions_asked >= max_questions:
        return QuestionDecision(
            action="STOP",
            reason=f"Safety limit reached (MAX_QUESTIONS={max_questions}). Marking as LIMITED_HISTORY.",
            confidence=0.85,
            language_code=lang
        )

    # 3. Guardrail D: Consecutive Low-Progress Stop
    max_low_progress = getattr(settings, "MAX_CONSECUTIVE_LOW_PROGRESS", 2)
    if consecutive_low_progress >= max_low_progress:
        return QuestionDecision(
            action="STOP",
            reason=f"No meaningful clinical information progress detected for {consecutive_low_progress} turns. Stopping interview.",
            confidence=0.90,
            language_code=lang
        )

    # 4. Open-ended First Question if complaint is not yet provided
    if total_questions_asked == 0 and not state.chief_complaint:
        first_q_map = {
            "hi": "नमस्ते! कृपया बताएं कि आपको क्या मुख्य समस्या या तकलीफ हो रही है?",
            "mr": "नमस्कार! कृपया सांगा की तुम्हाला मुख्यत्वे काय त्रास होत आहे?",
            "en": "Hello! Please tell me what main symptom or health concern you are experiencing today."
        }
        return QuestionDecision(
            action="ASK",
            question=first_q_map.get(lang, first_q_map["en"]),
            target_field="chief_complaint",
            reason="Initial open-ended complaint elicitation",
            reasoning_mode="OPEN_EXPLORATION",
            confidence=0.99,
            language_code=lang
        )

    # Collect previously asked target fields
    asked_target_fields: Set[str] = set(state.resolved_dimensions)

    # 5. Classify Clinical Domains & Score Candidate Question Dimensions
    domains = classify_clinical_domains(state, workflow_type)
    primary_domain = domains[0] if domains else ClinicalDomain.GENERAL
    candidates = score_candidate_dimensions(domains, state, asked_questions, asked_target_fields)

    # Update state.missing_information for physician review
    open_gaps = find_information_gaps(state, workflow_type, asked_questions)
    state.missing_information = open_gaps

    # Filter candidates to only those that are NOT already resolved and have positive score
    viable_candidates = [
        c for c in candidates
        if not is_field_already_resolved(c["field_name"], state) and c["score"] > 0
    ]

    # 6. Information Sufficiency & Termination Reasoning Gate
    is_sufficient, stop_reason = _assess_information_sufficiency(
        state=state,
        primary_domain=primary_domain,
        viable_candidates=viable_candidates,
        total_questions_asked=total_questions_asked
    )

    if is_sufficient or not viable_candidates:
        return QuestionDecision(
            action="STOP",
            reason=stop_reason or f"Clinical information sufficiency achieved for {primary_domain} presentation.",
            confidence=0.96,
            language_code=lang
        )

    # 7. Select Top Candidate & Formulate Adaptive Question
    llm = get_llm_service()
    selected_candidate = viable_candidates[0]
    target_field = selected_candidate["field_name"]
    reasoning_mode = selected_candidate.get("reasoning_mode", "TARGETED_FOLLOW_UP")
    state.active_exploration_mode = reasoning_mode

    # If the user previously had a non-informative / confused answer (e.g. "wtf"), make sure we don't repeat the same question
    if state.last_non_informative_response:
        state.last_non_informative_response = None
        if len(viable_candidates) > 1:
            # Shift to the alternative top dimension
            selected_candidate = viable_candidates[1]
            target_field = selected_candidate["field_name"]
            reasoning_mode = selected_candidate.get("reasoning_mode", "TARGETED_FOLLOW_UP")
            state.active_exploration_mode = reasoning_mode

    rag_context = None
    # Use RAG selectively for AYUSH workflow or knowledge-dependent clinical fields
    if db is not None and (workflow_type == "AYUSH" or target_field in ["agni", "koshtha", "ahara_vihara", "associated_symptoms", "food_exposure"]):
        try:
            rag_query = f"{domains[0]} assessment for {target_field} with {state.chief_complaint or 'symptoms'}"
            rag_context = await rag_service.retrieve(
                query=rag_query,
                db=db,
                workflow=workflow_type if workflow_type == "AYUSH" else "ALL",
                language=lang,
                top_k=3,
                min_similarity=0.45
            )
        except Exception:
            rag_context = None

    selected_question = await llm.generate_adaptive_question(
        target_field=target_field,
        chief_complaint=state.chief_complaint,
        language_code=lang,
        rag_context=rag_context
    )

    # 8. Anti-Loop Deduplication Guardrail
    if is_semantic_duplicate(selected_question, asked_questions):
        for alt_cand in viable_candidates[1:]:
            alt_field = alt_cand["field_name"]
            alt_q = await llm.generate_adaptive_question(
                target_field=alt_field,
                chief_complaint=state.chief_complaint,
                language_code=lang,
                rag_context=rag_context
            )
            if not is_semantic_duplicate(alt_q, asked_questions):
                selected_question = alt_q
                target_field = alt_field
                selected_candidate = alt_cand
                reasoning_mode = selected_candidate.get("reasoning_mode", "TARGETED_FOLLOW_UP")
                state.active_exploration_mode = reasoning_mode
                break

    # Structured Forensic Debug Logging
    logger.debug(
        f"[FORENSIC DEBUG] Turn {total_questions_asked}: CC='{state.chief_complaint}', "
        f"Selected='{target_field}' (mode={reasoning_mode}, score={selected_candidate['score']}), "
        f"Explored={state.explored_areas}, Resolved={state.resolved_dimensions}"
    )

    # Record target dimension in resolved tracking
    if target_field not in state.resolved_dimensions:
        state.resolved_dimensions.append(target_field)
    if target_field.startswith("open_") and target_field not in state.explored_areas:
        state.explored_areas.append(target_field)
    if target_field not in state.asked_dimension_history:
        state.asked_dimension_history.append(target_field)

    return QuestionDecision(
        action="ASK",
        question=selected_question,
        target_field=target_field,
        reason=f"Targeting high-gain clinical dimension [{target_field}] ({reasoning_mode}) for {selected_candidate['domain']} domain (score={selected_candidate['score']})" + (" [RAG-grounded]" if rag_context and rag_context.has_relevant_context else ""),
        reasoning_mode=reasoning_mode,
        confidence=0.94,
        language_code=lang
    )
