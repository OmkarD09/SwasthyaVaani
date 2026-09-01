import pytest
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.services.safety.red_flags import evaluate_red_flags


@pytest.mark.asyncio
async def test_scenario_a_acidity_open_exploration():
    """
    TEST A — ACIDITY
    Patient: 'Stomach acidity.'
    Expected: Open clinical exploration, does NOT immediately ask about dark stool or stool frequency.
    """
    state = ClinicalState(chief_complaint="Stomach acidity", symptoms=["Acidity / Burning"])
    decision = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        total_questions_asked=1,
        language_code="en"
    )
    assert decision.action == "ASK"
    assert decision.target_field in ["open_gi_exploration", "meal_relationship", "duration"]
    assert decision.target_field != "dark_stool_onset"
    assert decision.target_field != "stool_frequency"
    assert decision.reasoning_mode in ["OPEN_EXPLORATION", "TARGETED_FOLLOW_UP"]
    assert "blood" not in (decision.question or "").lower()


@pytest.mark.asyncio
async def test_scenario_b_acidity_and_vomiting():
    """
    TEST B — ACIDITY + VOMITING
    Patient: 'I have acidity and vomiting.'
    Expected: Follows vomiting/acidity appropriately, then allows open exploration of GI symptoms.
    """
    state = ClinicalState()
    state, facts, _ = extract_clinical_facts_from_answer(
        raw_answer="I have acidity and vomiting",
        target_field="chief_complaint",
        current_state=state
    )
    assert state.chief_complaint == "I have acidity and vomiting"
    assert "Vomiting" in state.associated_symptoms

    decision = await evaluate_next_question(
        state=state,
        total_questions_asked=1,
        language_code="en"
    )
    assert decision.action == "ASK"
    assert decision.target_field in ["open_gi_exploration", "food_exposure", "duration", "vomiting"]
    assert decision.target_field != "stool_frequency"


@pytest.mark.asyncio
async def test_scenario_c_patient_volunteers_dark_stool():
    """
    TEST C — PATIENT VOLUNTEERS STOOL ISSUE
    Patient: 'My stools have become very dark.'
    Expected: Engine recognizes new stool-related fact and drills down (TARGETED_FOLLOW_UP).
    Does NOT ask patient to rediscover whether stool is abnormal.
    """
    state = ClinicalState(chief_complaint="Stomach acidity", duration="3 days")
    state.resolved_dimensions.extend(["duration", "open_gi_exploration"])

    state, facts, _ = extract_clinical_facts_from_answer(
        raw_answer="My stools have become very dark.",
        target_field="open_gi_exploration",
        current_state=state
    )
    assert state.dark_stool is True
    assert "Dark / Black stool" in state.associated_symptoms

    decision = await evaluate_next_question(
        state=state,
        total_questions_asked=2,
        language_code="en"
    )
    assert decision.action == "ASK"
    assert decision.target_field in ["dark_stool_onset", "dark_stool_consistency", "blood_in_stool"]
    assert decision.reasoning_mode in ["TARGETED_FOLLOW_UP", "SAFETY_REQUIRED"]
    assert "dark" in (decision.question or "").lower() or "black" in (decision.question or "").lower() or "stool" in (decision.question or "").lower()


@pytest.mark.asyncio
async def test_scenario_d_no_stool_issue():
    """
    TEST D — NO STOOL ISSUE
    Patient: 'No, nothing else unusual.'
    Expected: Does not repeatedly ask stool-related questions.
    Moves to the next high-value area or terminates if sufficient.
    """
    state = ClinicalState(chief_complaint="Stomach acidity", duration="2 days", location="Upper abdomen")
    state.resolved_dimensions.extend(["duration", "location"])

    state, facts, _ = extract_clinical_facts_from_answer(
        raw_answer="No, nothing else unusual",
        target_field="open_gi_exploration",
        current_state=state
    )
    assert "other_symptoms" in state.negated_symptoms
    assert "open_gi_exploration" in state.explored_areas

    decision = await evaluate_next_question(
        state=state,
        total_questions_asked=3,
        language_code="en"
    )
    # Must NOT ask unprompted stool questions
    assert decision.target_field not in ["stool_frequency", "stool_consistency", "dark_stool_onset", "bowel_movement_recency"]
    # Can ask meal relationship or stop cleanly via minimum sufficient history
    if decision.action == "ASK":
        assert decision.target_field in ["meal_relationship", "antacid_relief"]


@pytest.mark.asyncio
async def test_scenario_e_cough_respiratory_only():
    """
    TEST E — COUGH
    Patient: 'I have a cough.'
    Expected: Respiratory-relevant exploration. Do NOT ask GI/stool/urine questions without reason.
    """
    state = ClinicalState(chief_complaint="I have a cough")
    decision = await evaluate_next_question(
        state=state,
        total_questions_asked=1,
        language_code="en"
    )
    assert decision.action == "ASK"
    assert decision.target_field in ["open_respiratory_exploration", "cough_type", "duration", "breathlessness"]
    assert decision.target_field not in ["stool_frequency", "stool_consistency", "dark_stool_onset", "urinary_symptoms", "agni"]


@pytest.mark.asyncio
async def test_scenario_f_headache_exploration_only():
    """
    TEST F — HEADACHE
    Patient: 'I have a headache.'
    Expected: Headache-relevant exploration. No irrelevant GI/urinary questionnaire.
    """
    state = ClinicalState(chief_complaint="I have a headache")
    decision = await evaluate_next_question(
        state=state,
        total_questions_asked=1,
        language_code="en"
    )
    assert decision.action == "ASK"
    assert decision.target_field in ["open_headache_exploration", "distribution", "duration", "photophobia"]
    assert decision.target_field not in ["stool_frequency", "stool_consistency", "urinary_symptoms", "bowel_movement_recency"]


@pytest.mark.asyncio
async def test_scenario_g_already_known_information():
    """
    TEST G — ALREADY KNOWN INFORMATION
    Patient: 'I have been vomiting for 3 days.'
    Expected: ClinicalState records duration = 3 days. The engine must NOT ask: 'How long have you been vomiting?'
    """
    state = ClinicalState()
    state, facts, _ = extract_clinical_facts_from_answer(
        raw_answer="I have been vomiting for 3 days",
        target_field="chief_complaint",
        current_state=state
    )
    assert state.duration == "3 days"
    assert "Vomiting" in state.associated_symptoms

    decision = await evaluate_next_question(
        state=state,
        total_questions_asked=1,
        language_code="en"
    )
    assert decision.action == "ASK"
    assert decision.target_field != "duration"
    assert "how long" not in (decision.question or "").lower()


@pytest.mark.asyncio
async def test_scenario_h_partial_answer_handling():
    """
    TEST H — PARTIAL ANSWER
    Question: 'Does it get worse after eating or lying down?'
    Patient: 'Yes.'
    Expected: System must NOT mark both dimensions as definitely true without qualification.
    """
    state = ClinicalState(chief_complaint="Stomach acidity")
    state, facts, _ = extract_clinical_facts_from_answer(
        raw_answer="Yes",
        target_field="meal_relationship",
        current_state=state
    )
    assert state.dimension_status.get("meal_relationship") == "PARTIALLY_KNOWN"
    assert "meal_relationship" in facts


@pytest.mark.asyncio
async def test_scenario_i_open_exploration_discovery():
    """
    TEST I — OPEN EXPLORATION DISCOVERY
    Patient: 'Besides the stomach pain, I've also been feeling dizzy and weak.'
    Expected: Both dizziness and weakness extracted. Next question prioritizes hydration / clinical stability.
    """
    state = ClinicalState(chief_complaint="Stomach pain", duration="2 days")
    state, facts, _ = extract_clinical_facts_from_answer(
        raw_answer="Besides the stomach pain, I've also been feeling dizzy and weak.",
        target_field="open_gi_exploration",
        current_state=state
    )
    assert state.dizziness == "Present"
    assert state.weakness == "Present"
    assert "Dizziness" in state.associated_symptoms
    assert "Weakness / Fatigue" in state.associated_symptoms

    decision = await evaluate_next_question(
        state=state,
        total_questions_asked=2,
        language_code="en"
    )
    assert decision.action == "ASK"
    assert decision.target_field in ["hydration_status", "blood_in_stool", "abdominal_location", "severity", "onset"]


@pytest.mark.asyncio
async def test_scenario_j_safety_red_flag_detection():
    """
    TEST J — SAFETY
    Patient mentions dark stool + dizziness.
    Expected: Existing deterministic safety engine triggers RF-GI-001 red flag and SAFETY_REQUIRED mode.
    """
    state = ClinicalState(
        chief_complaint="Stomach discomfort",
        dark_stool=True,
        dizziness="Present",
        associated_symptoms=["Dark / Black stool", "Dizziness"]
    )
    flags = evaluate_red_flags(state)
    assert len(flags) > 0
    assert any(f.rule_id == "RF-GI-001" for f in flags)
    assert any("Melena" in f.title or "Bleeding" in f.title for f in flags)

    decision = await evaluate_next_question(
        state=state,
        total_questions_asked=2,
        language_code="en"
    )
    assert decision.action == "ASK"
    assert decision.reasoning_mode in ["SAFETY_REQUIRED", "TARGETED_FOLLOW_UP"]
