"""
Unit and Integration Tests for Milestone 2: Adaptive AYUSH Candidate Pool Expansion.
Verifies:
1. Expanded Dashavidha dimensions in AYUSH candidate pool.
2. Domain isolation (Dashavidha penalized in non-AYUSH domains).
3. Contextual relevance boost for Sattva/Vyayama without clinical inference.
4. Multi-factor deduplication and semantic clustering.
5. AYUSH sufficiency evaluation without premature cut-off.
6. Extraction and ambiguity handling.
7. Production extraction schema completeness.
8. Multilingual phrasing across EN, HI, MR.
"""

import pytest
from app.schemas.clinical_state import ClinicalState, AyushState
from app.schemas.ayush import AyushAssessmentStatus
from app.services.clinical_ai.question_scorer import (
    score_candidate_dimensions,
    is_field_already_resolved,
    MAP_TO_CANONICAL,
    SEMANTIC_CLUSTERS,
    DOMAIN_DIMENSIONS,
    ClinicalDomain,
)
from app.services.clinical_ai.adaptive_engine import _assess_information_sufficiency
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer
from app.services.providers.llm_provider import (
    ClinicalExtractionSchema,
    MockLLMProvider,
)


def test_production_extraction_schema_includes_ayush():
    """Verify production ClinicalExtractionSchema contains all AYUSH dimensions."""
    fields = ClinicalExtractionSchema.model_fields
    # Core AYUSH
    assert "agni" in fields
    assert "koshtha" in fields
    assert "ahara_vihara" in fields
    # Dashavidha
    assert "sara" in fields
    assert "samhanana" in fields
    assert "pramana" in fields
    assert "satmya" in fields
    assert "sattva" in fields
    assert "ahara_shakti" in fields
    assert "vyayama_shakti" in fields
    assert "vaya" in fields


def test_ayush_candidate_pool_expansion():
    """Verify that an AYUSH intake includes the 8 expanded Dashavidha dimensions."""
    state = ClinicalState(chief_complaint="chronic indigestion and joint pain", duration="1 month")
    candidates = score_candidate_dimensions(
        domains=[ClinicalDomain.AYUSH],
        state=state,
        asked_questions=[],
    )
    candidate_fields = [c["field_name"] for c in candidates]
    expected_expanded = [
        "sara", "samhanana", "pramana", "satmya",
        "sattva", "ahara_shakti", "vyayama_shakti", "vaya"
    ]
    for dim in expected_expanded:
        assert dim in candidate_fields, f"Expected {dim} in candidate pool"


def test_domain_isolation_penalizes_ayush_in_general_clinical():
    """Verify Dashavidha dimensions are penalized and never selected in non-AYUSH domains."""
    state = ClinicalState(chief_complaint="red eye and discharge", location="Eyes")
    candidates = score_candidate_dimensions(
        domains=[ClinicalDomain.OPHTHALMIC],
        state=state,
        asked_questions=[],
    )
    # Filter candidates with positive score
    viable = [c for c in candidates if c["score"] > 0]
    viable_fields = [c["field_name"] for c in viable]

    dashavidha_fields = ["sara", "samhanana", "pramana", "satmya", "sattva", "ahara_shakti", "vyayama_shakti", "vaya"]
    for dim in dashavidha_fields:
        assert dim not in viable_fields, f"Dashavidha dimension {dim} should not be viable in Ophthalmic domain"


def test_contextual_relevance_boost_for_sattva_without_clinical_inference():
    """
    Contextual keywords like stress/anxiety must boost candidate relevance for Sattva,
    but MUST NOT mark Sattva resolved or infer clinical state.
    """
    state_without_stress = ClinicalState(
        chief_complaint="digestive trouble",
        duration="1 week",
        raw_transcript_snippets=["I have stomach trouble since 1 week."]
    )
    candidates_normal = score_candidate_dimensions(
        domains=[ClinicalDomain.AYUSH],
        state=state_without_stress,
        asked_questions=[],
    )
    sattva_normal = next(c for c in candidates_normal if c["field_name"] == "sattva")

    # Now add stress/anxiety keywords
    state_with_stress = ClinicalState(
        chief_complaint="digestive trouble",
        duration="1 week",
        raw_transcript_snippets=["I have stomach trouble and have been under huge mental stress and anxiety."]
    )
    candidates_boosted = score_candidate_dimensions(
        domains=[ClinicalDomain.AYUSH],
        state=state_with_stress,
        asked_questions=[],
    )
    sattva_boosted = next(c for c in candidates_boosted if c["field_name"] == "sattva")

    # Verify score boost
    assert sattva_boosted["score"] == sattva_normal["score"] + 35

    # CRITICAL: Sattva must NOT be marked resolved by the mere mention of stress
    assert not is_field_already_resolved("sattva", state_with_stress)
    assert "sattva" not in state_with_stress.resolved_dimensions
    assert state_with_stress.get_canonical_dimension("sattva") is None


def test_contextual_relevance_boost_for_vyayama_shakti():
    """Keywords like fatigue/weakness boost candidate relevance for Vyayama Shakti."""
    state_fatigue = ClinicalState(
        chief_complaint="joint pain",
        duration="2 weeks",
        raw_transcript_snippets=["I feel constant fatigue and weakness when doing daily tasks."]
    )
    candidates = score_candidate_dimensions(
        domains=[ClinicalDomain.AYUSH],
        state=state_fatigue,
        asked_questions=[],
    )
    vyayama = next(c for c in candidates if c["field_name"] == "vyayama_shakti")
    sara = next(c for c in candidates if c["field_name"] == "sara")
    # Vyayama should receive the +35 boost
    assert vyayama["score"] > sara["score"]


def test_deduplication_and_semantic_clustering():
    """Verify that resolved dimensions are disqualified and semantic clusters prevent duplicates."""
    state = ClinicalState(chief_complaint="acid peptic disorder")
    # Set sattva as resolved
    state.set_canonical_dimension("sattva", "KNOWN_WITH_VALUE", value="Pravara")

    candidates = score_candidate_dimensions(
        domains=[ClinicalDomain.AYUSH],
        state=state,
        asked_questions=[],
        asked_target_fields={"sattva"},
    )
    sattva_cand = next(c for c in candidates if c["field_name"] == "sattva")
    assert sattva_cand["score"] < 0, "Resolved/asked dimension must have negative score"

    # Clustered ahara_shakti: if agni and ahara_vihara are resolved, ahara_shakti is marked resolved
    state.ayush = AyushState(agni="Manda", ahara_vihara="Spicy fried food daily")
    assert is_field_already_resolved("ahara_shakti", state)


def test_ayush_sufficiency_not_premature():
    """
    Verify AYUSH sufficiency requires core profile + low information gain,
    and does NOT prematurely terminate when high-gain candidates remain.
    """
    # Case 1: Core history missing duration
    state_no_dur = ClinicalState(
        chief_complaint="digestive trouble",
        ayush=AyushState(agni="Manda")
    )
    is_suff, _ = _assess_information_sufficiency(
        state=state_no_dur,
        primary_domain=ClinicalDomain.AYUSH,
        viable_candidates=[{"field_name": "duration", "score": 85, "reasoning_mode": "TARGETED_FOLLOW_UP"}],
        total_questions_asked=2
    )
    assert not is_suff, "Must not terminate when duration is missing"

    # Case 2: Core history present, but high-yield candidate remains (e.g. Sattva with stress boost >= 70)
    state_with_stress = ClinicalState(
        chief_complaint="digestive trouble",
        duration="5 days",
        ayush=AyushState(agni="Manda"),
        raw_transcript_snippets=["I have severe anxiety and stress"]
    )
    high_gain_cand = [{"field_name": "sattva", "score": 100, "reasoning_mode": "TARGETED_FOLLOW_UP"}]
    is_suff, _ = _assess_information_sufficiency(
        state=state_with_stress,
        primary_domain=ClinicalDomain.AYUSH,
        viable_candidates=high_gain_cand,
        total_questions_asked=3
    )
    assert not is_suff, "Must not terminate prematurely when high-gain candidate (score >= 70) is available"

    # Case 3: Core history satisfied AND remaining candidates are low gain (< 70)
    state_satisfied = ClinicalState(
        chief_complaint="digestive trouble",
        duration="5 days",
        ayush=AyushState(agni="Manda", koshtha="Krura")
    )
    low_gain_cands = [
        {"field_name": "sara", "score": 50, "reasoning_mode": "TARGETED_FOLLOW_UP"},
        {"field_name": "pramana", "score": 50, "reasoning_mode": "TARGETED_FOLLOW_UP"}
    ]
    is_suff, reason = _assess_information_sufficiency(
        state=state_satisfied,
        primary_domain=ClinicalDomain.AYUSH,
        viable_candidates=low_gain_cands,
        total_questions_asked=3
    )
    assert is_suff, "Should terminate when core profile resolved and remaining gain is low"
    assert "AYUSH" in reason


def test_deterministic_fact_extraction_ayush():
    """Verify mock provider extracts normalized AYUSH values."""
    state = ClinicalState()

    # Test agni extraction
    st, facts, prog = extract_clinical_facts_from_answer("My appetite is very low and sluggish (manda)", "agni", state)
    assert facts.get("agni") == "Manda"
    assert st.ayush.agni == "Manda"

    # Test koshtha extraction
    st2, facts2, prog2 = extract_clinical_facts_from_answer("I suffer from hard stool and severe constipation", "koshtha", st)
    assert facts2.get("koshtha") == "Krura"
    assert st2.ayush.koshtha == "Krura"

    # Test sattva extraction
    st3, facts3, prog3 = extract_clinical_facts_from_answer("I stay calm and patient under pressure", "sattva", st2)
    assert facts3.get("sattva") == "Pravara"
    assert st3.get_canonical_dimension("sattva").status == "KNOWN_WITH_VALUE"

    # Test ambiguous sattva response
    st4, facts4, prog4 = extract_clinical_facts_from_answer("I am not sure, cannot say really", "sattva", st2)
    assert st4.get_canonical_dimension("sattva").status == "AMBIGUOUS"


@pytest.mark.asyncio
async def test_multilingual_question_generation():
    """Verify natural phrasing generation across English, Hindi, and Marathi."""
    provider = MockLLMProvider()
    dashavidha_fields = ["sara", "samhanana", "pramana", "satmya", "sattva", "ahara_shakti", "vyayama_shakti", "vaya"]

    for dim in dashavidha_fields:
        q_en = await provider.generate_adaptive_question(dim, "joint pain", language_code="en")
        assert len(q_en) > 10
        assert not q_en.startswith("Could you share")

        q_hi = await provider.generate_adaptive_question(dim, "जोड़ों का दर्द", language_code="hi")
        assert len(q_hi) > 10
        assert not q_hi.startswith("कृपया अपने")

        q_mr = await provider.generate_adaptive_question(dim, "सांधेदुखी", language_code="mr")
        assert len(q_mr) > 10
        assert not q_mr.startswith("कृपया तुमच्या")
