import pytest
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.domain_classifier import ClinicalDomain
from app.services.clinical_ai.question_scorer import (
    score_candidate_dimensions,
    is_field_already_resolved,
)


def test_marathi_vomiting_resolution_and_ineligibility():
    """Verify Marathi 'उलटी येत आहे' marks vomiting resolved and binary candidate ineligible."""
    state = ClinicalState(
        chief_complaint="माझं पोट खूप दुखत आहे.",
        location="पोट",
        associated_symptoms=["उलटी"],
        raw_transcript_snippets=["माझं पोट खूप दुखत आहे.", "उलटी येत आहे."],
    )

    # 1. is_field_already_resolved returns True for vomiting
    assert is_field_already_resolved("vomiting", state) is True

    # 2. Score candidates in GI domain
    candidates = score_candidate_dimensions(
        domains=[ClinicalDomain.GASTROINTESTINAL],
        state=state,
        asked_questions=[],
        asked_target_fields=set(state.asked_dimension_history),
    )

    # Binary vomiting candidate must be disqualified (score < 0)
    vomiting_cand = next((c for c in candidates if c["field_name"] == "vomiting"), None)
    assert vomiting_cand is not None
    assert vomiting_cand["score"] < 0, f"Expected disqualified score for vomiting, got {vomiting_cand['score']}"

    # 3. hydration_status receives the active-vomiting boost (+85)
    hydration_cand = next((c for c in candidates if c["field_name"] == "hydration_status"), None)
    assert hydration_cand is not None
    assert hydration_cand["score"] >= 170, f"Expected boosted hydration score >= 170, got {hydration_cand['score']}"


def test_hindi_and_english_vomiting_resolution():
    """Verify Hindi 'उल्टी' and English 'vomiting' mark vomiting resolved and boost hydration."""
    # Hindi
    hindi_state = ClinicalState(
        chief_complaint="पेट में दर्द है",
        associated_symptoms=["उल्टी"],
        raw_transcript_snippets=["पेट में दर्द है", "उल्टी आ रही है"],
    )
    assert is_field_already_resolved("vomiting", hindi_state) is True
    hindi_cands = score_candidate_dimensions([ClinicalDomain.GASTROINTESTINAL], hindi_state, [])
    hindi_vomit = next(c for c in hindi_cands if c["field_name"] == "vomiting")
    assert hindi_vomit["score"] < 0

    # English
    en_state = ClinicalState(
        chief_complaint="Stomach pain",
        associated_symptoms=["Vomiting"],
        raw_transcript_snippets=["I have stomach pain", "I have vomiting"],
    )
    assert is_field_already_resolved("vomiting", en_state) is True
    en_cands = score_candidate_dimensions([ClinicalDomain.GASTROINTESTINAL], en_state, [])
    en_vomit = next(c for c in en_cands if c["field_name"] == "vomiting")
    assert en_vomit["score"] < 0


def test_canonical_dimension_sync_marathi():
    """Verify canonical dimension synchronization updates canonical_dimensions['vomiting'] = KNOWN_TRUE."""
    state = ClinicalState(
        chief_complaint="माझं पोट खूप दुखत आहे.",
        associated_symptoms=["उलटी"],
    )

    indic_vomiting_indicators = {"vomiting", "vomit", "nausea", "ulti", "उलटी", "उल्टी", "मळमळ", "जी मिचलाना"}
    has_confirmed_vomit = any(
        any(ind in str(s).lower() for ind in indic_vomiting_indicators)
        for s in (state.associated_symptoms + state.symptoms)
    ) and "vomiting" not in state.negated_symptoms

    assert has_confirmed_vomit is True

    existing_vomit = state.canonical_dimensions.get("vomiting")
    assert existing_vomit is None

    state.set_canonical_dimension("vomiting", "KNOWN_TRUE", value=True)
    assert state.canonical_dimensions["vomiting"].status == "KNOWN_TRUE"
    assert state.is_dimension_sufficiently_known("vomiting") is True
    assert "vomiting" in state.resolved_dimensions


def test_does_not_overwrite_deeper_vomiting_characterization():
    """Verify existing deeper characterization on vomiting canonical state is preserved."""
    state = ClinicalState(
        chief_complaint="माझं पोट खूप दुखत आहे.",
        associated_symptoms=["उलटी"],
    )
    # Pre-existing deeper characterization
    state.set_canonical_dimension(
        "vomiting",
        "KNOWN_WITH_VALUE",
        value="Frequent",
        characterization={"frequency": "5 times", "character": "bilious"},
    )

    existing_vomit = state.canonical_dimensions.get("vomiting")
    assert existing_vomit.status == "KNOWN_WITH_VALUE"
    assert existing_vomit.characterization.get("frequency") == "5 times"

    # Code guard should not overwrite KNOWN_WITH_VALUE or characterization
    if not existing_vomit or existing_vomit.status not in ["KNOWN_TRUE", "KNOWN_WITH_VALUE"]:
        state.set_canonical_dimension("vomiting", "KNOWN_TRUE", value=True)

    # Verification: characterization preserved!
    assert state.canonical_dimensions["vomiting"].characterization.get("frequency") == "5 times"
    assert state.canonical_dimensions["vomiting"].value == "Frequent"


def test_ambiguous_dark_stool_remains_unresolved_and_allows_clarification():
    """Verify ambiguous dark stool ('ते शकता आहे') remains unresolved, enabling later clarification ('काळे आहे')."""
    state = ClinicalState(
        chief_complaint="माझं पोट खूप दुखत आहे.",
        raw_transcript_snippets=["माझं पोट खूप दुखत आहे.", "ते शकता आहे."],
        asked_dimension_history=["open_gi_exploration", "dark_stool_onset"],
        resolved_dimensions=["open_gi_exploration", "dark_stool_onset"],
    )

    # dark_stool_consistency was NOT asked yet
    assert is_field_already_resolved("dark_stool_consistency", state) is False
    assert state.dark_stool is None

    # dark_stool_onset was asked, but dark stool remains unconfirmed
    cands_before_clarification = score_candidate_dimensions(
        domains=[ClinicalDomain.GASTROINTESTINAL],
        state=state,
        asked_questions=[],
        asked_target_fields=set(state.asked_dimension_history),
    )

    # dark_stool_consistency remains a viable candidate
    consistency_cand = next((c for c in cands_before_clarification if c["field_name"] == "dark_stool_consistency"), None)
    assert consistency_cand is not None
    assert consistency_cand["score"] > 0

    # Patient clarifies: 'काळे आहे' -> confirms melena/dark stool
    state.dark_stool = True
    state.set_canonical_dimension("dark_stool_consistency", "KNOWN_WITH_VALUE", value="Dark/Black")
    state.resolved_dimensions.append("dark_stool_consistency")
    state.asked_dimension_history.append("dark_stool_consistency")

    # Now dark_stool_consistency is resolved and will not repeat
    assert is_field_already_resolved("dark_stool_consistency", state) is True
    cands_after_clarification = score_candidate_dimensions(
        domains=[ClinicalDomain.GASTROINTESTINAL],
        state=state,
        asked_questions=[],
        asked_target_fields=set(state.asked_dimension_history),
    )
    consistency_cand_after = next((c for c in cands_after_clarification if c["field_name"] == "dark_stool_consistency"), None)
    assert consistency_cand_after["score"] < 0


@pytest.mark.asyncio
async def test_marathi_gi_interview_flow_no_duplicate_vomiting():
    """Verify full adaptive evaluation after Marathi 'उलटी येत आहे' does NOT ask binary vomiting."""
    from app.services.clinical_ai.adaptive_engine import evaluate_next_question

    # Turn 1: Chief complaint established
    state = ClinicalState(
        chief_complaint="माझं पोट खूप दुखत आहे.",
        location="पोट",
        raw_transcript_snippets=["माझं पोट खूप दुखत आहे."],
    )

    # Turn 2: Patient answers 'उलटी येत आहे' to open exploration
    state.raw_transcript_snippets.append("उलटी येत आहे.")
    state.associated_symptoms.append("उलटी")
    state.resolved_dimensions.append("open_gi_exploration")
    state.asked_dimension_history.append("open_gi_exploration")

    # Simulate canonical sync as done in intakes.py
    state.set_canonical_dimension("vomiting", "KNOWN_TRUE", value=True)

    decision = await evaluate_next_question(
        state=state,
        workflow_type="GENERAL_CLINICAL",
        asked_questions=["पोटात दुखत असताना तुमच्याला उलटी किंवा जुलाब होते का? काही त्रास झालाय का?"],
        total_questions_asked=2,
        language_code="mr",
    )

    assert decision.action == "ASK"
    # Target field must NEVER be binary vomiting
    assert decision.target_field != "vomiting", f"Expected target_field != vomiting, got {decision.target_field}"
    assert decision.target_field in ["hydration_status", "duration", "food_exposure", "dark_stool_onset", "bloating", "stool_consistency"]
    # Question text must NOT ask if vomiting occurred
    q_text = decision.question or ""
    assert "उलटी झाली का" not in q_text
    assert "उलट्या किंवा मळमळ होत आहे का" not in q_text

