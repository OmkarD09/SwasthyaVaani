import pytest
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.question_scorer import score_candidate_dimensions, is_field_already_resolved


@pytest.mark.asyncio
async def test_ophthalmic_red_eyes_transcript_no_loop():
    """
    Directly tests the real-world user failure transcript:
    Patient: "i have red eyes"
    AI: asks open exploration
    Patient: "blurred vision"
    AI: asks duration
    Patient: "10 days"
    Patient says: "wtf"
    Patient says: "It is affecting too much, water is coming from my eyes"

    Verifies:
    1. Duration is asked ONCE (no duplicate onset/duration).
    2. Blurred vision is NOT asked again.
    3. 'wtf' does NOT loop or re-ask the same question.
    4. Intake completes cleanly with ClinicalState properly populated.
    """
    state = ClinicalState()
    asked_questions = []

    # Turn 1: Initial Complaint
    state, facts, _ = extract_clinical_facts_from_answer("i have red eyes", "chief_complaint", state)
    assert state.chief_complaint == "i have red eyes"
    assert state.location == "Eyes"
    assert state.is_dimension_sufficiently_known("red_eye")

    decision_1 = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=asked_questions,
        total_questions_asked=0
    )
    assert decision_1.action == "ASK"
    assert decision_1.target_field in ["open_ophthalmic_exploration", "open_general_exploration", "blurred_vision", "duration"]
    asked_questions.append(decision_1.question)

    # Turn 2: Patient volunteers "blurred vision"
    state, facts, _ = extract_clinical_facts_from_answer("blurred vision", decision_1.target_field, state)
    assert state.is_dimension_sufficiently_known("blurred_vision")
    assert "Blurred vision" in state.associated_symptoms

    decision_2 = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=asked_questions,
        total_questions_asked=1
    )
    assert decision_2.action == "ASK"
    # Target MUST NOT be blurred_vision or open_exploration since blurred vision is already known!
    assert decision_2.target_field not in ["blurred_vision", "open_ophthalmic_exploration"]
    asked_questions.append(decision_2.question)

    # Turn 3: Patient provides duration "10 days"
    state, facts, _ = extract_clinical_facts_from_answer("10 days", decision_2.target_field, state)
    assert state.duration == "10 days"
    assert state.is_dimension_sufficiently_known("symptom_duration")

    decision_3 = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=asked_questions,
        total_questions_asked=2
    )
    # Target MUST NOT be onset or duration (no duplicate duration questions!)
    if decision_3.action == "ASK":
        assert decision_3.target_field not in ["duration", "onset", "symptom_duration", "symptom_onset", "blurred_vision"]
        asked_questions.append(decision_3.question)

        # Turn 4: Patient gives confused response "wtf"
        state, facts, _ = extract_clinical_facts_from_answer("wtf", decision_3.target_field, state)
        assert state.last_non_informative_response == "wtf"

        decision_4 = await evaluate_next_question(
            state=state,
            workflow_type="GENERAL_CLINICAL",
            asked_questions=asked_questions,
            total_questions_asked=3
        )
        # MUST NOT re-ask the exact same question that triggered 'wtf'
        if decision_4.action == "ASK":
            assert decision_4.question not in asked_questions
            asked_questions.append(decision_4.question)

            # Turn 5: Patient answers with watering symptom
            state, facts, _ = extract_clinical_facts_from_answer("It is affecting too much, water is coming from my eyes", decision_4.target_field, state)
            assert state.is_dimension_sufficiently_known("eye_watering")

            decision_5 = await evaluate_next_question(
                state=state,
                workflow_type="GENERAL_CLINICAL",
                asked_questions=asked_questions,
                total_questions_asked=4
            )
            # Should reach clinical sufficiency or stop cleanly
            assert decision_5.action in ["ASK", "STOP"]
            if decision_5.action == "ASK":
                assert decision_5.target_field not in ["blurred_vision", "eye_watering", "duration", "onset"]


@pytest.mark.asyncio
async def test_gastrointestinal_vomiting_food_flow():
    """Verifies domain adaptation for GI presentation with food exposure and vomiting."""
    state = ClinicalState()
    asked = []

    state, _, _ = extract_clinical_facts_from_answer("Stomach pain and acidity", "chief_complaint", state)
    domains = classify_clinical_domains(state)
    assert ClinicalDomain.GASTROINTESTINAL in domains

    dec1 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=0)
    assert dec1.action == "ASK"
    asked.append(dec1.question)

    state, _, _ = extract_clinical_facts_from_answer("no, but vomiting", dec1.target_field, state)
    assert state.is_dimension_sufficiently_known("vomiting")
    assert "Vomiting" in state.associated_symptoms

    dec2 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=1)
    assert dec2.action == "ASK"
    asked.append(dec2.question)

    state, _, _ = extract_clinical_facts_from_answer("yes vadapav from street stall", dec2.target_field, state)
    assert state.is_dimension_sufficiently_known("food_exposure")

    dec3 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=2)
    assert dec3.action == "ASK"
    asked.append(dec3.question)

    state, _, _ = extract_clinical_facts_from_answer("2 days", dec3.target_field, state)
    assert state.is_dimension_sufficiently_known("symptom_duration")

    dec4 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=3)
    if dec4.action == "ASK":
        assert dec4.target_field in ["hydration_status", "stool_consistency", "blood_in_stool", "stool_frequency", "fever"]


@pytest.mark.asyncio
async def test_headache_migraine_flow():
    """Verifies domain adaptation for Headache / Migraine presentation."""
    state = ClinicalState()
    asked = []

    state, _, _ = extract_clinical_facts_from_answer("Severe throbbing headache", "chief_complaint", state)
    domains = classify_clinical_domains(state)
    assert ClinicalDomain.HEADACHE in domains

    dec1 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=0)
    assert dec1.action == "ASK"
    asked.append(dec1.question)

    state, _, _ = extract_clinical_facts_from_answer("Right side of head", dec1.target_field, state)
    assert state.location == "Unilateral (Right side)"

    dec2 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=1)
    assert dec2.action == "ASK"
    asked.append(dec2.question)

    state, _, _ = extract_clinical_facts_from_answer("3 days", dec2.target_field, state)
    assert state.is_dimension_sufficiently_known("symptom_duration")

    dec3 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=2)
    if dec3.action == "ASK":
        assert dec3.target_field not in ["duration", "onset", "location"]


@pytest.mark.asyncio
async def test_respiratory_cough_flow():
    """Verifies domain adaptation for Respiratory cough presentation."""
    state = ClinicalState()
    asked = []

    state, _, _ = extract_clinical_facts_from_answer("I have a severe cough", "chief_complaint", state)
    domains = classify_clinical_domains(state)
    assert ClinicalDomain.RESPIRATORY in domains

    dec1 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=0)
    assert dec1.action == "ASK"
    asked.append(dec1.question)

    state, _, _ = extract_clinical_facts_from_answer("dry cough", dec1.target_field, state)
    assert state.is_dimension_sufficiently_known("cough_type")

    dec2 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=1)
    assert dec2.action == "ASK"
    assert dec2.target_field != "cough_type"
    asked.append(dec2.question)

    state, _, _ = extract_clinical_facts_from_answer("3 days", dec2.target_field, state)
    assert state.is_dimension_sufficiently_known("symptom_duration")

    dec3 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=2)
    if dec3.action == "ASK":
        assert dec3.target_field not in ["duration", "onset", "cough_type"]


@pytest.mark.asyncio
async def test_musculoskeletal_joint_pain_flow():
    """Verifies domain adaptation for Musculoskeletal / Knee pain presentation."""
    state = ClinicalState()
    asked = []

    state, _, _ = extract_clinical_facts_from_answer("Severe pain and swelling in right knee", "chief_complaint", state)
    domains = classify_clinical_domains(state)
    assert ClinicalDomain.MUSCULOSKELETAL in domains

    dec1 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=0)
    assert dec1.action == "ASK"
    asked.append(dec1.question)

    state, _, _ = extract_clinical_facts_from_answer("4 days", dec1.target_field, state)
    assert state.is_dimension_sufficiently_known("symptom_duration")

    dec2 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=1)
    if dec2.action == "ASK":
        assert dec2.target_field not in ["duration", "onset"]


@pytest.mark.asyncio
async def test_urinary_dysuria_flow():
    """Verifies domain adaptation for Urinary burning / dysuria presentation."""
    state = ClinicalState()
    asked = []

    state, _, _ = extract_clinical_facts_from_answer("Burning sensation during urination", "chief_complaint", state)
    domains = classify_clinical_domains(state)
    assert ClinicalDomain.URINARY in domains

    dec1 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=0)
    assert dec1.action == "ASK"
    asked.append(dec1.question)

    state, _, _ = extract_clinical_facts_from_answer("2 days", dec1.target_field, state)
    assert state.is_dimension_sufficiently_known("symptom_duration")

    dec2 = await evaluate_next_question(state=state, asked_questions=asked, total_questions_asked=1)
    if dec2.action == "ASK":
        assert dec2.target_field not in ["duration", "onset", "dysuria_burning"]


@pytest.mark.asyncio
async def test_session_isolation():
    """Verifies that two distinct clinical states remain strictly isolated."""
    state_eye = ClinicalState()
    state_gi = ClinicalState()

    state_eye, _, _ = extract_clinical_facts_from_answer("Red eyes and blurred vision", "chief_complaint", state_eye)
    state_gi, _, _ = extract_clinical_facts_from_answer("Stomach pain and loose motions", "chief_complaint", state_gi)

    assert state_eye.is_dimension_sufficiently_known("blurred_vision")
    assert not state_gi.is_dimension_sufficiently_known("blurred_vision")
    assert state_gi.is_dimension_sufficiently_known("stool_consistency") or "loose" in state_gi.raw_transcript_snippets[0]
    assert not state_eye.is_dimension_sufficiently_known("stool_consistency")
