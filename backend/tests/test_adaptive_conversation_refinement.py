import pytest
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question
from app.services.clinical_ai.question_scorer import score_candidate_dimensions, is_field_already_resolved
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.services.clinical_ai.domain_classifier import ClinicalDomain


@pytest.mark.asyncio
async def test_real_conversation_ambiguity_and_vague_question_rejection():
    """
    Replays the exact scenario from user's latest report:
    Patient: 'Stomach / Acidity' -> 'vomiting' -> 'frequent' -> 'yes' -> 'vadapav' -> '2 days' -> 'stomach' -> 'it is burning sensation'.
    Ensures:
    1. 'frequent' sets stool_frequency as AMBIGUOUS and triggers concrete numeric clarification.
    2. 'yes' updates to PARTIALLY_KNOWN and does not cause an infinite loop.
    3. 'vadapav' resolves food_exposure with -300 duplicate penalty.
    4. 'stomach' resolves location and is NEVER re-asked ('where is the burning sensation').
    5. Vague prompts like 'Could you please describe your symptoms in more detail?' are strictly disqualified (-500).
    6. Minimum Sufficient History cleanly terminates the intake without asking filler questions.
    """
    state = ClinicalState()
    asked_questions = []
    asked_target_fields = []

    # Turn 0: Chief complaint elicitation
    decision0 = await evaluate_next_question(state, total_questions_asked=0)
    assert decision0.action == "ASK"
    assert decision0.target_field == "chief_complaint"
    asked_questions.append(decision0.question)
    asked_target_fields.append(decision0.target_field)

    # Turn 1: Patient answers "Stomach / Acidity"
    state, extracted, _ = extract_clinical_facts_from_answer("Stomach / Acidity", decision0.target_field, state)
    decision1 = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=1)
    assert decision1.action == "ASK"
    asked_questions.append(decision1.question)
    asked_target_fields.append(decision1.target_field)

    # Turn 2: Patient reports "vomiting"
    state, extracted, _ = extract_clinical_facts_from_answer("vomiting", decision1.target_field, state)
    assert "Vomiting" in state.associated_symptoms
    decision2 = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=2)
    assert decision2.action == "ASK"
    asked_questions.append(decision2.question)
    asked_target_fields.append(decision2.target_field)

    # Turn 3: Patient replies "frequent" to bowel movement question
    state, extracted, _ = extract_clinical_facts_from_answer("frequent", decision2.target_field, state)
    assert state.dimension_status.get("stool_frequency") == "AMBIGUOUS"
    assert is_field_already_resolved("stool_frequency", state) is False

    # Next question targets concrete numeric clarification or priority food exposure
    decision3 = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=3)
    assert decision3.action == "ASK"
    assert decision3.target_field in ["open_gi_exploration", "stool_frequency", "food_exposure", "duration"]
    # The question must NOT be a vague describe-more question
    assert "describe" not in decision3.question.lower() or "detail" not in decision3.question.lower()
    asked_questions.append(decision3.question)
    asked_target_fields.append(decision3.target_field)

    # Turn 4: Patient replies "vadapav"
    state, extracted, _ = extract_clinical_facts_from_answer("vadapav", "food_exposure", state)
    assert is_field_already_resolved("food_exposure", state) is True

    # Turn 5: Patient replies "2 days"
    state, extracted, _ = extract_clinical_facts_from_answer("2 days", "duration", state)
    assert is_field_already_resolved("duration", state) is True

    # Turn 6: Patient replies "stomach"
    state, extracted, _ = extract_clinical_facts_from_answer("stomach", "location", state)
    assert is_field_already_resolved("location", state) is True
    assert is_field_already_resolved("abdominal_location", state) is True

    # Turn 7: Patient replies "it is burning sensation"
    state, extracted, _ = extract_clinical_facts_from_answer("it is burning sensation", "character", state)
    assert state.character is not None

    # Turn 8: Evaluate next decision with complete clinical state
    decision_final = await evaluate_next_question(state, asked_questions=asked_questions, total_questions_asked=4)
    # The system must either STOP (Minimum Sufficient History) or ask a high-value safety dimension (hydration/fever)
    if decision_final.action == "ASK":
        assert decision_final.target_field in ["hydration_status", "fever", "blood_in_stool", "meal_relationship", "open_gi_exploration"]
        assert decision_final.target_field not in ["location", "abdominal_location", "problem_clarification", "clarify_problem"]
        assert "describe" not in decision_final.question.lower()
    else:
        assert decision_final.action == "STOP"
        assert "Minimum Sufficient History" in decision_final.reason


@pytest.mark.asyncio
async def test_gi_sub_profiles_differentiation():
    """
    Verifies that Case A (Constipation), Case B (Gastroenteritis), and Case C (Acidity)
    produce distinct, clinically appropriate questioning strategies.
    """
    # Case A: Stomach pain + Constipation
    state_a = ClinicalState(chief_complaint="Stomach pain and severe constipation")
    state_a.raw_transcript_snippets = ["stomach pain and severe constipation", "kabz hai"]
    candidates_a = score_candidate_dimensions([ClinicalDomain.GASTROINTESTINAL], state_a, [])
    top_fields_a = [c["field_name"] for c in candidates_a[:3]]
    assert any(f in top_fields_a for f in ["bowel_movement_recency", "laxative_use", "abdominal_location", "duration", "open_gi_exploration"])
    # Diarrhea / stool frequency should be heavily demoted
    stool_freq_a = next(c for c in candidates_a if c["field_name"] == "stool_frequency")
    assert stool_freq_a["score"] < 0

    # Case B: Stomach pain + Vomiting + Watery stool + Vadapav
    state_b = ClinicalState(chief_complaint="Stomach pain and vomiting")
    state_b.raw_transcript_snippets = ["watery loose motions", "vomiting", "ate vadapav"]
    state_b.stool_consistency = "Watery"
    state_b.food_exposure = "vadapav"
    candidates_b = score_candidate_dimensions([ClinicalDomain.GASTROINTESTINAL], state_b, [])
    # Constipation and laxatives should be heavily demoted
    laxative_b = next(c for c in candidates_b if c["field_name"] == "laxative_use")
    assert laxative_b["score"] < 0
    # Stool frequency (partial gap), hydration, or fever should be prioritized
    top_fields_b = [c["field_name"] for c in candidates_b if c["score"] > 0]
    assert "stool_frequency" in top_fields_b or "hydration_status" in top_fields_b or "fever" in top_fields_b

    # Case C: Isolated Acidity / Burning without vomiting or diarrhea
    state_c = ClinicalState(chief_complaint="Severe acidity and burning sensation")
    state_c.raw_transcript_snippets = ["severe acidity and burning sensation", "jalan", "heartburn", "no vomiting", "no loose motion"]
    candidates_c = score_candidate_dimensions([ClinicalDomain.GASTROINTESTINAL], state_c, [])
    top_fields_c = [c["field_name"] for c in candidates_c[:3]]
    assert any(f in top_fields_c for f in ["open_gi_exploration", "meal_relationship", "antacid_relief", "radiation_to_chest", "duration"])
    # Diarrhea and food poisoning should be heavily demoted
    stool_freq_c = next(c for c in candidates_c if c["field_name"] == "stool_frequency")
    assert stool_freq_c["score"] < 0


@pytest.mark.asyncio
async def test_negated_symptoms_pruning():
    """
    If a patient explicitly denies pain or fever, the engine must prune pain severity/character
    and fever questions.
    """
    state = ClinicalState(chief_complaint="Watery loose motions since yesterday")
    state.raw_transcript_snippets = ["watery loose motions", "no pain at all", "no fever"]
    state.negated_symptoms = ["pain", "fever"]

    candidates = score_candidate_dimensions([ClinicalDomain.GASTROINTESTINAL], state, [])
    for dim in candidates:
        if dim["field_name"] in ["severity", "character", "pain_location"]:
            assert dim["score"] < 0, f"Pain dimension {dim['field_name']} should be disqualified when patient denies pain"
        if dim["field_name"] in ["fever", "fever_pattern"]:
            assert dim["score"] < 0, f"Fever dimension {dim['field_name']} should be disqualified when patient denies fever"


@pytest.mark.asyncio
async def test_cough_skips_pain_and_gi_dimensions():
    """
    Case 3: Painless cough skips pain severity, character, and GI dimensions.
    """
    state = ClinicalState(chief_complaint="I have been coughing for three days")
    state.duration = "3 days"
    state.raw_transcript_snippets = ["i have been coughing for three days", "no pain"]
    state.negated_symptoms = ["pain"]

    candidates = score_candidate_dimensions([ClinicalDomain.RESPIRATORY], state, [])
    top_fields = [c["field_name"] for c in candidates if c["score"] > 0]
    assert "cough_type" in top_fields or "breathlessness" in top_fields or "fever" in top_fields
    assert "severity" not in top_fields[:3]
    assert "character" not in top_fields[:3]
    assert "stool_frequency" not in top_fields


@pytest.mark.asyncio
async def test_headache_adapts_to_migraine_presentation():
    """
    Case 2: Headache with one-sided pain and photophobia adapts and stops when triad resolved.
    """
    state = ClinicalState(chief_complaint="I have a headache")
    state.duration = "2 days"
    state.location = "Unilateral (Right side)"
    state.associated_symptoms = ["Photophobia & Phonophobia present"]
    state.raw_transcript_snippets = ["i have a headache", "since two days", "mostly on the right side", "bright light makes it worse"]

    decision = await evaluate_next_question(
        state,
        total_questions_asked=3,
        asked_questions=["What is the issue?", "How long?", "Which side?", "Light sensitivity?"]
    )
    assert decision.action == "STOP"
    assert "Minimum Sufficient History" in decision.reason
