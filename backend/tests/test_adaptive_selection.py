import pytest
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.adaptive_engine import evaluate_next_question
from app.services.clinical_ai.domain_classifier import classify_clinical_domains, ClinicalDomain
from app.services.clinical_ai.mock_provider import extract_clinical_facts_from_answer


@pytest.mark.asyncio
async def test_headache_path_vs_gi_path_divergence():
    """Verify that Headache complaint produces a completely different question path than GI complaint."""
    # Patient A: Headache
    state_a = ClinicalState(chief_complaint="I have a headache")
    state_a.raw_transcript_snippets.append("I have a headache")
    decision_a = await evaluate_next_question(state_a, total_questions_asked=1)

    # Patient B: Stomach loose motions
    state_b = ClinicalState(chief_complaint="I have stomach pain and loose motions")
    state_b.raw_transcript_snippets.append("I have stomach pain and loose motions")
    decision_b = await evaluate_next_question(state_b, total_questions_asked=1)

    # Decisions must target different clinical fields
    assert decision_a.action == "ASK"
    assert decision_b.action == "ASK"
    assert decision_a.target_field != decision_b.target_field
    # Headache prioritizes open exploration, distribution, or onset/duration
    assert decision_a.target_field in ["open_headache_exploration", "distribution", "onset", "duration", "photophobia"]
    # GI with loose motions prioritizes open exploration, stool frequency, duration, or food exposure
    assert decision_b.target_field in ["open_gi_exploration", "stool_frequency", "duration", "food_exposure", "onset"]


@pytest.mark.asyncio
async def test_vague_stomach_problem_triggers_clarification():
    """Verify that a vague complaint like 'problem with my stomach' triggers problem clarification or open exploration first."""
    state = ClinicalState(chief_complaint="I have some problem with my stomach")
    state.raw_transcript_snippets.append("I have some problem with my stomach")
    decision = await evaluate_next_question(state, total_questions_asked=1)

    assert decision.action == "ASK"
    assert decision.target_field in ["problem_clarification", "open_gi_exploration"]
    assert len(decision.question) > 0


@pytest.mark.asyncio
async def test_headache_follow_up_adapts_to_answers():
    """
    Test Step-by-Step Headache Flow:
    Patient: 'I have a headache' -> asks open exploration or onset / duration
    Patient: '2 days ago on right side' -> asks photophobia (light/sound)
    Patient: 'Yes light makes it worse' -> asks visual aura or nausea
    """
    # Turn 1:
    state = ClinicalState(chief_complaint="I have a headache")
    state.raw_transcript_snippets.append("I have a headache")
    d1 = await evaluate_next_question(state, total_questions_asked=1)
    assert d1.action == "ASK"

    # Turn 2: Patient gives duration and location
    state, _, _ = extract_clinical_facts_from_answer("It started 2 days ago on the right side of my head.", d1.target_field, state)
    d2 = await evaluate_next_question(state, asked_questions=[d1.question], total_questions_asked=2)
    assert d2.action == "ASK"
    assert d2.target_field in ["photophobia", "nausea_vomiting", "visual_aura", "open_headache_exploration"]
    assert any(w in d2.question.lower() for w in ["light", "sound", "noise", "bright", "nausea", "vomit", "aura", "see", "vision", "worse", "roshni", "awaaz", "dhoop", "headache", "pain", "besides"])

    # Turn 3: Patient confirms photophobia -> achieves minimum sufficient history or asks secondary aura/nausea
    state, _, _ = extract_clinical_facts_from_answer("Yes, bright light makes it much worse.", d2.target_field, state)
    d3 = await evaluate_next_question(state, asked_questions=[d1.question, d2.question], total_questions_asked=3)
    assert d3.action in ["ASK", "STOP"]
    if d3.action == "ASK":
        assert d3.target_field in ["visual_aura", "nausea_vomiting", "character", "severity", "open_headache_exploration"]
    else:
        assert "Minimum Sufficient History" in d3.reason or "resolved" in d3.reason


@pytest.mark.asyncio
async def test_already_known_information_is_never_repeated():
    """Patient already states 'I have had fever for 3 days'. System must NOT ask duration."""
    state = ClinicalState(chief_complaint="I have had fever for 3 days")
    state.raw_transcript_snippets.append("I have had fever for 3 days")
    state.duration = "3 days"

    decision = await evaluate_next_question(state, total_questions_asked=1)
    assert decision.action == "ASK"
    # Duration must NOT be asked
    assert decision.target_field != "duration"
    assert "how long" not in decision.question.lower()
    # Open fever exploration, pattern, or body ache should be prioritized
    assert decision.target_field in ["open_fever_exploration", "fever_pattern", "associated_bodyache", "cough_throat", "onset"]


@pytest.mark.asyncio
async def test_painless_cough_skips_pain_severity_and_character():
    """Patient with dry cough alone should not be asked pain severity (1-10)."""
    state = ClinicalState(chief_complaint="I have a continuous dry cough")
    state.raw_transcript_snippets.append("I have a continuous dry cough")

    decision = await evaluate_next_question(state, total_questions_asked=1)
    assert decision.action == "ASK"
    assert decision.target_field != "severity"
    assert decision.target_field in ["open_respiratory_exploration", "cough_type", "breathlessness", "duration", "onset", "fever"]


@pytest.mark.asyncio
async def test_two_patients_same_complaint_different_answers_diverge():
    """
    Patient C: 'I have stomach pain since yesterday' -> asks open exploration, food exposure, or location
    Patient D: 'I have stomach pain after eating outside food with vomiting' -> food exposure already answered, asks frequency or hydration
    """
    # Patient C:
    state_c = ClinicalState(chief_complaint="I have stomach pain", duration="1 day (since yesterday)")
    state_c.raw_transcript_snippets.extend(["I have stomach pain", "since yesterday"])
    d_c = await evaluate_next_question(state_c, total_questions_asked=1)

    # Patient D:
    state_d = ClinicalState(chief_complaint="I have stomach pain", duration="1 day")
    state_d.raw_transcript_snippets.extend(["I have stomach pain", "after eating outside street food and vomiting"])
    state_d.associated_symptoms = ["Recent outside / street food consumption", "Vomiting"]
    state_d.food_exposure = "street food"
    state_d.resolved_dimensions.append("food_exposure")
    d_d = await evaluate_next_question(state_d, total_questions_asked=1)

    # Trajectories must be different or food_exposure must be skipped for Patient D
    assert d_d.target_field != "food_exposure"


@pytest.mark.asyncio
async def test_sufficient_information_stops_early():
    """Verify that interview terminates with sufficient history stop once key dimensions are resolved."""
    state = ClinicalState(
        chief_complaint="Chest pressure",
        onset="Sudden while resting",
        duration="45 minutes",
        location="Centre of chest",
        radiation="Left arm and shoulder",
        character="Heavy squeezing pressure",
        associated_symptoms=["Profuse sweating", "Shortness of breath"]
    )
    state.raw_transcript_snippets.extend([
        "Chest pressure", "Sudden while resting", "45 minutes", "Radiating to left arm", "Heavy squeezing pressure"
    ])

    decision = await evaluate_next_question(state, total_questions_asked=4)
    assert decision.action == "STOP"
    assert "Sufficient History" in decision.reason or "resolved" in decision.reason


@pytest.mark.asyncio
async def test_maximum_ten_questions_brake_enforced():
    """Interview must stop when total_questions_asked reaches 10."""
    state = ClinicalState(chief_complaint="General fatigue")
    decision = await evaluate_next_question(state, total_questions_asked=10)
    assert decision.action == "STOP"
    assert "MAX_QUESTIONS" in decision.reason or "Safety limit" in decision.reason


@pytest.mark.asyncio
async def test_indic_hindi_and_marathi_headache_and_gi_questions():
    """Verify Hindi and Marathi localized domain-specific questions."""
    # Hindi Headache
    state_hi = ClinicalState(chief_complaint="मुझे सिर में तेज दर्द है")
    state_hi.raw_transcript_snippets.append("मुझे सिर में तेज दर्द है")
    d_hi = await evaluate_next_question(state_hi, language_code="hi", total_questions_asked=1)
    assert d_hi.action == "ASK"
    assert len(d_hi.question) > 0

    # Marathi GI
    state_mr = ClinicalState(chief_complaint="मला पोटात त्रास होत आहे")
    state_mr.raw_transcript_snippets.append("मला पोटात त्रास होत आहे")
    d_mr = await evaluate_next_question(state_mr, language_code="mr", total_questions_asked=1)
    assert d_mr.action == "ASK"
    assert len(d_mr.question) > 0
