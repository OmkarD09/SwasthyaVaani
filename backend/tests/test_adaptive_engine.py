import pytest

from app.schemas.clinical_state import AyushState, ClinicalState
from app.services.clinical_ai.adaptive_engine import (
    evaluate_next_question,
    is_semantic_duplicate,
)
from app.services.clinical_ai.gap_analysis import find_information_gaps


def test_gap_analysis_identifies_unresolved_fields():
    state = ClinicalState(chief_complaint="Chest pain")
    gaps = find_information_gaps(state, "GENERAL_CLINICAL")
    
    # Onset, duration, severity, location should be open
    field_names = [g.field_name for g in gaps]
    assert "onset" in field_names
    assert "duration" in field_names
    assert "severity" in field_names
    assert "location" in field_names


def test_gap_analysis_resolves_populated_fields():
    state = ClinicalState(
        chief_complaint="Fever",
        onset="Gradual",
        duration="3 days",
        severity=5
    )
    gaps = find_information_gaps(state, "GENERAL_CLINICAL")
    field_names = [g.field_name for g in gaps]
    
    assert "onset" not in field_names
    assert "duration" not in field_names
    assert "severity" not in field_names
    assert "location" in field_names


def test_gap_analysis_ayush_workflow():
    state = ClinicalState(
        chief_complaint="Knee pain",
        onset="Slow",
        duration="6 months",
        ayush=AyushState(agni="Tikshna", koshtha="Mridu")
    )
    gaps = find_information_gaps(state, "AYUSH")
    field_names = [g.field_name for g in gaps]
    
    assert "agni" not in field_names
    assert "koshtha" not in field_names
    assert "location" in field_names


def test_semantic_duplicate_detection():
    asked = [
        "When did this trouble first start, and did it begin suddenly or gradually?",
        "For how many days or weeks have you been feeling this?"
    ]
    
    # Exact or near exact matches
    assert is_semantic_duplicate("when did this trouble first start, and did it begin suddenly or gradually?", asked)
    assert is_semantic_duplicate("For how many days or weeks have you been feeling this?", asked)
    
    # Non-duplicate candidate
    assert not is_semantic_duplicate("Where exactly do you feel this discomfort in your body?", asked)


@pytest.mark.asyncio
async def test_adaptive_engine_asks_question_for_open_gaps():
    state = ClinicalState(chief_complaint="Abdominal pain")
    decision = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=[],
        consecutive_low_progress=0,
        total_questions_asked=1,
        language_code="en"
    )
    
    assert decision.action == "ASK"
    assert decision.question is not None
    assert decision.target_field in ["open_gi_exploration", "onset", "duration", "severity", "location", "abdominal_location", "stool_frequency", "problem_clarification", "bloating"]


@pytest.mark.asyncio
async def test_adaptive_engine_hindi_support():
    state = ClinicalState(chief_complaint="पेट में दर्द")
    decision = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=[],
        consecutive_low_progress=0,
        total_questions_asked=1,
        language_code="hi"
    )
    
    assert decision.action == "ASK"
    assert decision.language_code == "hi"
    assert len(decision.question) > 0


@pytest.mark.asyncio
async def test_adaptive_engine_consecutive_low_progress_guardrail():
    state = ClinicalState(chief_complaint="Fever")
    decision = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=[],
        consecutive_low_progress=2,  # MAX_CONSECUTIVE_LOW_PROGRESS reached
        total_questions_asked=4
    )
    
    assert decision.action == "STOP"
    assert "No meaningful clinical information progress" in (decision.reason or "")


@pytest.mark.asyncio
async def test_adaptive_engine_emergency_limit_guardrail():
    state = ClinicalState(chief_complaint="Chronic headache")
    decision = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=[],
        consecutive_low_progress=0,
        total_questions_asked=10  # MAX_QUESTIONS reached
    )
    
    assert decision.action == "STOP"
    assert "safety limit reached" in (decision.reason or "").lower()


@pytest.mark.asyncio
async def test_adaptive_engine_sufficient_information_stop():
    # Fully populated state
    state = ClinicalState(
        chief_complaint="Acidity",
        onset="Gradual",
        duration="2 weeks",
        severity=4,
        location="Epigastrium",
        character="Burning sensation",
        associated_symptoms=["Nausea"],
        aggravating_factors=["Spicy food"],
        relieving_factors=["Cold milk"]
    )
    decision = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=[],
        consecutive_low_progress=0,
        total_questions_asked=5
    )
    
    assert decision.action == "STOP"
