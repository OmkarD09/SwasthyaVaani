import pytest
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.services.clinical_ai.question_scorer import (
    score_candidate_dimensions,
    is_field_already_resolved,
    ClinicalDomain
)


def test_english_positive_vs_negative_vomiting():
    """Verify English positive creates KNOWN_TRUE and negative creates KNOWN_FALSE."""
    # Positive
    state_pos = ClinicalState(chief_complaint="Stomach pain")
    updated_pos, extracted_pos, _ = extract_clinical_facts_from_answer(
        "I am vomiting frequently", "vomiting", state_pos
    )
    assert updated_pos.canonical_dimensions["vomiting"].status == "KNOWN_TRUE"
    assert updated_pos.canonical_dimensions["vomiting"].value is True
    assert "vomiting" not in updated_pos.negated_symptoms
    assert any("vomit" in str(s).lower() for s in updated_pos.associated_symptoms)

    # Negative
    state_neg = ClinicalState(chief_complaint="Stomach pain")
    updated_neg, extracted_neg, _ = extract_clinical_facts_from_answer(
        "No, I am not vomiting.", "vomiting", state_neg
    )
    assert updated_neg.canonical_dimensions["vomiting"].status == "KNOWN_FALSE"
    assert updated_neg.canonical_dimensions["vomiting"].value is False
    assert "vomiting" in updated_neg.negated_symptoms
    assert not any("vomit" in str(s).lower() for s in updated_neg.associated_symptoms)
    assert "negated_symptoms" in extracted_neg
    assert "vomiting" in extracted_neg["negated_symptoms"]


def test_hindi_negative_vomiting():
    """Verify Hindi negation sets KNOWN_FALSE and updates negated_symptoms."""
    state = ClinicalState(chief_complaint="पेट में दर्द")
    updated_st, extracted, _ = extract_clinical_facts_from_answer(
        "मुझे उल्टी नहीं है", "vomiting", state
    )
    assert updated_st.canonical_dimensions["vomiting"].status == "KNOWN_FALSE"
    assert updated_st.canonical_dimensions["vomiting"].value is False
    assert "vomiting" in updated_st.negated_symptoms
    assert not any("vomit" in str(s).lower() or "उल्टी" in str(s) for s in updated_st.associated_symptoms)


def test_marathi_negative_vomiting():
    """Verify Marathi negation sets KNOWN_FALSE and updates negated_symptoms."""
    state = ClinicalState(chief_complaint="पोटात दुखत आहे")
    updated_st, extracted, _ = extract_clinical_facts_from_answer(
        "मला उलटी नाही होत", "vomiting", state
    )
    assert updated_st.canonical_dimensions["vomiting"].status == "KNOWN_FALSE"
    assert updated_st.canonical_dimensions["vomiting"].value is False
    assert "vomiting" in updated_st.negated_symptoms
    assert not any("vomit" in str(s).lower() or "उलटी" in str(s) for s in updated_st.associated_symptoms)


def test_canonical_dimensions_unknown_vs_known_false():
    """Verify distinction between UNKNOWN and KNOWN_FALSE."""
    # UNKNOWN (Fresh state without vomiting inquired or stated)
    fresh_state = ClinicalState(chief_complaint="Cough")
    assert "vomiting" not in fresh_state.canonical_dimensions
    assert fresh_state.is_dimension_sufficiently_known("vomiting") is False

    # KNOWN_FALSE
    neg_state = ClinicalState(chief_complaint="Stomach pain")
    updated_neg, _, _ = extract_clinical_facts_from_answer(
        "I haven't vomited at all", "vomiting", neg_state
    )
    dim = updated_neg.canonical_dimensions.get("vomiting")
    assert dim is not None
    assert dim.status == "KNOWN_FALSE"
    assert dim.value is False
    # KNOWN_FALSE counts as resolved / sufficiently known so it won't be redundantly asked
    assert updated_neg.is_dimension_sufficiently_known("vomiting") is True
    assert "vomiting" in updated_neg.resolved_dimensions


def test_negated_symptom_does_not_appear_in_associated_symptoms():
    """Explicitly negated symptoms must never leak into associated_symptoms list."""
    state = ClinicalState(chief_complaint="Abdominal cramps")
    updated_st, extracted, _ = extract_clinical_facts_from_answer(
        "No vomiting and no nausea", "nausea_vomiting", state
    )
    assert "vomiting" in updated_st.negated_symptoms
    assert len(updated_st.associated_symptoms) == 0
    assert "associated_symptoms" not in extracted or len(extracted.get("associated_symptoms", [])) == 0


def test_positive_and_negative_facts_cannot_silently_coexist():
    """Verify that contradictory positive and negative facts are cleansed and mutually exclusive."""
    # Start with prior positive vomiting
    state = ClinicalState(
        chief_complaint="Stomach pain",
        associated_symptoms=["Vomiting"],
    )
    state.set_canonical_dimension("vomiting", "KNOWN_TRUE", value=True)

    # Now an explicit negative is extracted
    updated_st, _, _ = extract_clinical_facts_from_answer(
        "No, I am not vomiting.", "vomiting", state
    )

    # In mock provider, negative answer cleanses the conflicting associated_symptoms
    assert not any("vomit" in str(s).lower() for s in updated_st.associated_symptoms)
    assert "vomiting" in updated_st.negated_symptoms
    assert updated_st.canonical_dimensions["vomiting"].status == "KNOWN_FALSE"

    # Now verify the inverse: a subsequent positive answer cleanses prior negation
    updated_st2, _, _ = extract_clinical_facts_from_answer(
        "Actually now I am vomiting", "vomiting", updated_st
    )
    assert "vomiting" not in updated_st2.negated_symptoms
    assert any("vomit" in str(s).lower() for s in updated_st2.associated_symptoms)
    assert updated_st2.canonical_dimensions["vomiting"].status == "KNOWN_TRUE"


def test_known_negative_vomiting_not_asked_again_as_binary_question():
    """Known-negative vomiting receives -500 penalty and is not asked again."""
    state = ClinicalState(chief_complaint="Stomach pain")
    updated_st, _, _ = extract_clinical_facts_from_answer(
        "No, I am not vomiting.", "vomiting", state
    )

    assert updated_st.canonical_dimensions["vomiting"].status == "KNOWN_FALSE"
    assert is_field_already_resolved("vomiting", updated_st) is True

    candidates = score_candidate_dimensions(
        domains=[ClinicalDomain.GASTROINTESTINAL],
        state=updated_st,
        asked_questions=[]
    )

    vomit_candidate = next((c for c in candidates if c["field_name"] == "nausea_vomiting"), None)
    if vomit_candidate:
        assert vomit_candidate["score"] <= -400  # Disqualified due to -500 penalty

    # In addition, active-vomiting fluid check boost (+85) must NOT fire when vomiting is negated
    hydration_candidate = next((c for c in candidates if c["field_name"] == "hydration_status"), None)
    if hydration_candidate:
        # base_score(50) + domain_weight(35) = 85 (without +85 active-vomiting boost)
        assert hydration_candidate["score"] == 85


def test_ambiguity_remains_unknown_not_known_false():
    """Statements expressing ambiguity ('I'm not sure') must remain UNKNOWN, not KNOWN_FALSE."""
    state = ClinicalState(chief_complaint="Stomach pain")
    updated_st, extracted, progress = extract_clinical_facts_from_answer(
        "I'm not sure whether I'm vomiting", "vomiting", state
    )

    # Must remain UNKNOWN
    vomit_dim = updated_st.canonical_dimensions.get("vomiting")
    assert vomit_dim is None or vomit_dim.status == "UNKNOWN"
    assert updated_st.is_dimension_sufficiently_known("vomiting") is False
    assert "vomiting" not in updated_st.negated_symptoms
    assert not any("vomit" in str(s).lower() for s in updated_st.associated_symptoms)


@pytest.mark.asyncio
async def test_negation_adaptive_flow_no_binary_vomiting():
    """Verify adaptive engine honors KNOWN_FALSE vomiting: does not re-ask vomiting."""
    from app.services.clinical_ai.adaptive_engine import evaluate_next_question

    state = ClinicalState(
        chief_complaint="I have bad abdominal cramps",
        location="Abdomen",
        raw_transcript_snippets=["I have bad abdominal cramps", "No, I am not vomiting."],
        negated_symptoms=["vomiting"],
    )
    state.set_canonical_dimension("vomiting", "KNOWN_FALSE", value=False)

    decision = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=["Are you experiencing any nausea or vomiting?"],
        total_questions_asked=2,
        language_code="en",
    )

    assert decision.action == "ASK"
    assert decision.target_field not in ["vomiting", "nausea_vomiting"]
    assert "vomit" not in (decision.question or "").lower()

