from typing import List, Optional, Any, Set
from sqlalchemy.orm import Session

from app.schemas.clinical_state import ClinicalState
from app.schemas.question import QuestionDecision
from app.services.clinical_ai.gap_analysis import find_information_gaps
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.question_scorer import score_candidate_dimensions, is_field_already_resolved, SEMANTIC_CLUSTERS
from app.services.safety.red_flags import evaluate_red_flags
from app.services.safety.contradictions import detect_contradictions
from app.core.config import settings
from app.services.providers.factory import get_llm_service
from app.services.rag.rag_service import rag_service


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


def _check_minimum_sufficient_history(
    state: ClinicalState,
    primary_domain: str,
    total_questions_asked: int
) -> bool:
    """
    Evaluates whether clinically sufficient information has been gathered to hand over to the physician.
    Prevents filler questions and terminates early as soon as the core clinical picture is clear.
    """
    if total_questions_asked < 3:
        return False

    snippets = " ".join(state.raw_transcript_snippets + [state.chief_complaint or ""]).lower()

    if primary_domain == ClinicalDomain.GASTROINTESTINAL:
        has_cc = bool(state.chief_complaint)
        has_dur = is_field_already_resolved("duration", state)
        has_food = is_field_already_resolved("food_exposure", state)
        has_stool = is_field_already_resolved("stool_frequency", state) or is_field_already_resolved("stool_consistency", state)
        has_upper = is_field_already_resolved("vomiting", state) or is_field_already_resolved("bloating", state) or is_field_already_resolved("abdominal_location", state)
        
        # Melena / Dark Stool profile
        if state.dark_stool:
            if has_cc and is_field_already_resolved("dark_stool_onset", state) and is_field_already_resolved("dark_stool_consistency", state):
                return True

        # Gastroenteritis profile
        if has_cc and has_dur and has_food and has_stool and has_upper:
            return True
        if total_questions_asked >= 4 and has_cc and has_dur and (has_food or has_stool):
            return True

        # Acidity/GERD profile
        has_acidity = any(w in snippets for w in ["acidity", "acid", "heartburn", "jalan"])
        has_open_exp = is_field_already_resolved("open_gi_exploration", state) or "other_symptoms" in state.negated_symptoms
        if has_acidity and has_cc and has_dur and (has_open_exp or is_field_already_resolved("meal_relationship", state) or is_field_already_resolved("location", state)):
            return True

    elif primary_domain == ClinicalDomain.HEADACHE:
        has_cc = bool(state.chief_complaint)
        has_dur = is_field_already_resolved("duration", state)
        has_dist = is_field_already_resolved("distribution", state)
        has_photo = is_field_already_resolved("photophobia", state)
        has_open_exp = is_field_already_resolved("open_headache_exploration", state) or "other_symptoms" in state.negated_symptoms
        if has_cc and has_dur and (has_photo or (has_dist and has_open_exp)):
            return True

    elif primary_domain == ClinicalDomain.RESPIRATORY:
        has_cc = bool(state.chief_complaint)
        has_dur = is_field_already_resolved("duration", state)
        has_cough = is_field_already_resolved("cough_type", state)
        has_breath = is_field_already_resolved("breathlessness", state)
        has_open_exp = is_field_already_resolved("open_respiratory_exploration", state) or "other_symptoms" in state.negated_symptoms
        if has_cc and has_dur and (has_cough or (has_breath and has_open_exp)):
            return True

    elif primary_domain == ClinicalDomain.FEVER:
        has_cc = bool(state.chief_complaint)
        has_dur = is_field_already_resolved("duration", state)
        has_fever_pat = is_field_already_resolved("fever_pattern", state)
        if has_cc and has_dur and has_fever_pat:
            return True

    elif primary_domain == ClinicalDomain.CARDIAC:
        has_cc = bool(state.chief_complaint)
        has_dur = is_field_already_resolved("duration", state)
        has_rad = is_field_already_resolved("radiation", state)
        has_char = is_field_already_resolved("character", state)
        if has_cc and has_dur and (has_rad or has_char):
            return True

    return False


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

    # 6. Minimum Sufficient History Stop Condition (Early Stop)
    if _check_minimum_sufficient_history(state, primary_domain, total_questions_asked):
        return QuestionDecision(
            action="STOP",
            reason=f"Minimum Sufficient History achieved for {primary_domain} presentation.",
            confidence=0.96,
            language_code=lang
        )

    if not viable_candidates:
        return QuestionDecision(
            action="STOP",
            reason="All relevant clinical dimensions for this complaint are resolved.",
            confidence=0.98,
            language_code=lang
        )

    # 7. Select Top Candidate & Formulate Adaptive Question
    llm = get_llm_service()
    selected_candidate = viable_candidates[0]
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

    # Record target dimension in resolved tracking
    if target_field not in state.resolved_dimensions:
        state.resolved_dimensions.append(target_field)
    if target_field.startswith("open_") and target_field not in state.explored_areas:
        state.explored_areas.append(target_field)

    return QuestionDecision(
        action="ASK",
        question=selected_question,
        target_field=target_field,
        reason=f"Targeting high-gain clinical dimension [{target_field}] ({reasoning_mode}) for {selected_candidate['domain']} domain (score={selected_candidate['score']})" + (" [RAG-grounded]" if rag_context and rag_context.has_relevant_context else ""),
        reasoning_mode=reasoning_mode,
        confidence=0.94,
        language_code=lang
    )
