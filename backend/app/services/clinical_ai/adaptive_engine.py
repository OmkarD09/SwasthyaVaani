from typing import List, Optional, Set
from app.schemas.clinical_state import ClinicalState
from app.schemas.question import QuestionDecision, CandidateQuestion
from app.services.clinical_ai.gap_analysis import find_information_gaps
from app.services.safety.red_flags import evaluate_red_flags
from app.services.safety.contradictions import detect_contradictions
from app.core.config import settings

# Deterministic Question Bank Mapped to Clinical Target Fields
DETERMINISTIC_QUESTION_BANK = {
    "en": {
        "onset": [
            "When did this trouble first start, and did it begin suddenly or gradually?",
            "How did this discomfort first begin?",
        ],
        "duration": [
            "For how many days or weeks have you been feeling this?",
            "How long has this issue lasted?",
        ],
        "severity": [
            "On a scale of 1 to 10, how severe is the pain or discomfort?",
            "How bothersome is this discomfort in your daily activities?",
        ],
        "location": [
            "Where exactly do you feel this discomfort in your body?",
            "Can you point to where it hurts the most?",
        ],
        "character": [
            "How would you describe the feeling — is it sharp, dull, burning, or heavy?",
            "What kind of sensation is it?",
        ],
        "associated_symptoms": [
            "Are you noticing any other symptoms like fever, nausea, or breathing changes?",
            "Do you feel any other changes in your body along with this?",
        ],
        "aggravating_factors": [
            "Does anything specific make the discomfort worse, such as food, movement, or rest?",
            "When does it feel more severe?",
        ],
        "relieving_factors": [
            "Has anything helped reduce the discomfort, such as medicine or rest?",
            "What makes you feel slightly better?",
        ],
        "agni": [
            "How is your appetite and digestion after eating meals?",
            "Do you feel heavy or acidic after eating?",
        ],
        "koshtha": [
            "How are your regular bowel habits and gut comfort?",
            "Are you experiencing constipation or loose motions?",
        ],
        "ahara_vihara": [
            "Are there any specific dietary or daily routine habits that trigger this?",
            "Tell us about your usual meal timings and physical activity.",
        ],
    },
    "hi": {
        "onset": [
            "यह तकलीफ कब और कैसे शुरू हुई — अचानक या धीरे-धीरे?",
            "यह परेशानी सबसे पहले कैसे शुरू हुई थी?",
        ],
        "duration": [
            "आपको यह परेशानी कितने दिनों या हफ़्तों से महसूस हो रही है?",
            "यह समस्या कितने समय से है?",
        ],
        "severity": [
            "1 से 10 के पैमाने पर, यह दर्द या तकलीफ कितनी तेज है?",
            "यह परेशानी आपके रोजमर्रा के कामों में कितनी रुकावट डाल रही है?",
        ],
        "location": [
            "शरीर में यह दर्द या परेशानी ठीक किस जगह पर हो रही है?",
            "दर्द सबसे ज्यादा कहाँ महसूस होता है?",
        ],
        "character": [
            "यह दर्द किस तरह का है — तेज, चुभने वाला, भारी या जलन जैसा?",
            "आपको कैसा महसूस होता है?",
        ],
        "associated_symptoms": [
            "क्या इसके साथ बुखार, सांस फूलना या जी मिचलाना जैसी कोई और तकलीफ भी है?",
            "क्या इसके साथ कोई और लक्षण भी दिखाई दे रहे हैं?",
        ],
        "aggravating_factors": [
            "क्या किसी खास खाने, चलने-फिरने या काम से यह तकलीफ बढ़ जाती है?",
            "यह परेशानी कब ज्यादा बढ़ जाती है?",
        ],
        "relieving_factors": [
            "क्या किसी दवा या आराम करने से कुछ राहत मिलती है?",
            "किस चीज से आपको थोड़ा आराम मिलता है?",
        ],
        "agni": [
            "आपकी भूख और खाना पचने की स्थिति कैसी रहती है?",
            "क्या खाना खाने के बाद पेट भारी या जलन महसूस होती है?",
        ],
        "koshtha": [
            "आपका पेट साफ होने की आदत कैसी है?",
            "क्या आपको कब्ज या दस्त की शिकायत रहती है?",
        ],
        "ahara_vihara": [
            "क्या खान-पान या दिनचर्या की किसी आदत से यह समस्या जुड़ी है?",
            "अपने भोजन के समय और दिनचर्या के बारे में बताएं।",
        ],
    }
}


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


def evaluate_next_question(
    state: ClinicalState,
    workflow_type: str = "GENERAL_CLINICAL",
    asked_questions: Optional[List[str]] = None,
    consecutive_low_progress: int = 0,
    total_questions_asked: int = 0,
    language_code: str = "en"
) -> QuestionDecision:
    """
    Main Adaptive Clinical Engine.
    Executes Minimum Sufficient History, Anti-Loop Guardrails, and Deterministic Fallback.
    """
    asked_questions = asked_questions or []
    lang = "hi" if language_code.startswith("hi") else "en"
    
    # 1. Evaluate Safety Rules first
    red_flags = evaluate_red_flags(state)
    state.red_flags = red_flags
    state.contradictions = detect_contradictions(state)
    
    # 2. Guardrail E: Emergency Question Limit Brake
    max_questions = settings.MAX_QUESTIONS_DEFAULT
    if total_questions_asked >= max_questions:
        return QuestionDecision(
            action="STOP",
            reason=f"Emergency safety limit reached (MAX_QUESTIONS={max_questions}). Marking as LIMITED_HISTORY.",
            confidence=0.85,
            language_code=lang
        )
        
    # 3. Guardrail D: Consecutive Low-Progress Stop
    max_low_progress = settings.MAX_CONSECUTIVE_LOW_PROGRESS
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
        
    # 6. Candidate Question Selection (Targeting highest priority unresolved gap)
    target_gap = gaps[0]
    target_field = target_gap.field_name
    
    question_pool = DETERMINISTIC_QUESTION_BANK.get(lang, DETERMINISTIC_QUESTION_BANK["en"]).get(
        target_field,
        ["Could you please provide more details about this concern?"]
    )
    
    # 7. Guardrail C: Deduplication check
    selected_question = None
    for q in question_pool:
        if not is_semantic_duplicate(q, asked_questions):
            selected_question = q
            break
            
    # Fallback to secondary question if first was duplicate
    if not selected_question:
        # Try next unresolved gap
        for alternate_gap in gaps[1:]:
            alt_pool = DETERMINISTIC_QUESTION_BANK.get(lang, DETERMINISTIC_QUESTION_BANK["en"]).get(alternate_gap.field_name, [])
            for q in alt_pool:
                if not is_semantic_duplicate(q, asked_questions):
                    selected_question = q
                    target_field = alternate_gap.field_name
                    break
            if selected_question:
                break
                
    if not selected_question:
        # No non-duplicate candidate remains
        return QuestionDecision(
            action="STOP",
            reason="No further non-repetitive candidate questions available. Stopping interview.",
            confidence=0.92,
            language_code=lang
        )
        
    return QuestionDecision(
        action="ASK",
        question=selected_question,
        target_field=target_field,
        reason=f"Targeting unresolved {target_gap.priority.lower()}-priority clinical gap: {target_field}",
        confidence=0.93,
        language_code=lang
    )
