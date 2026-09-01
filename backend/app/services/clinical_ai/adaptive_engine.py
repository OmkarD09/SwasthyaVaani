from typing import List, Optional
from app.schemas.clinical_state import ClinicalState
from app.schemas.question import QuestionDecision
from app.services.clinical_ai.gap_analysis import find_information_gaps
from app.services.safety.red_flags import evaluate_red_flags
from app.services.safety.contradictions import detect_contradictions
from app.core.config import settings
from app.services.providers.factory import get_llm_service


def is_semantic_duplicate(candidate: str, asked_questions: List[str]) -> bool:
    """Checks whether a candidate question is redundantly similar to previously asked questions."""
    cand_norm = candidate.lower().replace("?", "").replace(".", "").strip()
    for prev in asked_questions:
        prev_norm = prev.lower().replace("?", "").replace(".", "").strip()
        # Direct match or high token overlap
        if cand_norm == prev_norm:
            return True
        cand_words = set(cand_norm.split())
        prev_words = set(prev_norm.split())
        if len(cand_words) > 0 and len(prev_words) > 0:
            overlap = len(cand_words.intersection(prev_words)) / max(len(cand_words), len(prev_words))
            if overlap > 0.75:
                return True
    return False


async def evaluate_next_question(
    state: ClinicalState,
    workflow_type: str = "GENERAL_CLINICAL",
    asked_questions: Optional[List[str]] = None,
    consecutive_low_progress: int = 0,
    total_questions_asked: int = 0,
    language_code: str = "en"
) -> QuestionDecision:
    """
    Main Adaptive Clinical Engine.
    Evaluates Information Gaps and dynamically generates the next follow-up question via LLM (Gemini 2.5 Flash).
    Executes Minimum Sufficient History, Anti-Loop Guardrails, and Red Flag Safety Rules.
    """
    asked_questions = asked_questions or []
    lang = "hi" if language_code.startswith("hi") else "mr" if language_code.startswith("mr") else "en"
    
    # 1. Evaluate Safety Rules first
    red_flags = evaluate_red_flags(state)
    state.red_flags = red_flags
    state.contradictions = detect_contradictions(state)
    
    # 2. Guardrail E: Emergency Question Limit Brake (MAX_QUESTIONS = 10)
    max_questions = getattr(settings, "MAX_QUESTIONS_DEFAULT", 10)
    if total_questions_asked >= max_questions:
        return QuestionDecision(
            action="STOP",
            reason=f"Emergency safety limit reached (MAX_QUESTIONS={max_questions}). Marking as LIMITED_HISTORY.",
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
        
    # 4. Find unresolved information gaps
    gaps = find_information_gaps(state, workflow_type)
    state.missing_information = gaps
    
    # 5. Guardrail A: Sufficient Information Stop
    high_priority_gaps = [g for g in gaps if g.priority == "HIGH"]
    if len(high_priority_gaps) == 0 and len(gaps) <= 2 and total_questions_asked >= 3:
        return QuestionDecision(
            action="STOP",
            reason="Minimum Sufficient History achieved. All high-priority clinical targets resolved.",
            confidence=0.95,
            language_code=lang
        )
        
    if len(gaps) == 0:
        return QuestionDecision(
            action="STOP",
            reason="All clinical targets for this workflow are completely resolved.",
            confidence=0.98,
            language_code=lang
        )
        
    # 6. Dynamic Question Generation via LLM (Gemini 2.5 Flash)
    llm = get_llm_service()
    target_gap = gaps[0]
    target_field = target_gap.field_name

    selected_question = await llm.generate_adaptive_question(
        target_field=target_field,
        chief_complaint=state.chief_complaint,
        language_code=lang
    )

    # 7. Guardrail C: Deduplication check
    if is_semantic_duplicate(selected_question, asked_questions):
        for alternate_gap in gaps[1:]:
            alt_field = alternate_gap.field_name
            alt_q = await llm.generate_adaptive_question(
                target_field=alt_field,
                chief_complaint=state.chief_complaint,
                language_code=lang
            )
            if not is_semantic_duplicate(alt_q, asked_questions):
                selected_question = alt_q
                target_field = alt_field
                target_gap = alternate_gap
                break

    return QuestionDecision(
        action="ASK",
        question=selected_question,
        target_field=target_field,
        reason=f"Targeting unresolved {target_gap.priority.lower()}-priority clinical gap: {target_field}",
        confidence=0.93,
        language_code=lang
    )
