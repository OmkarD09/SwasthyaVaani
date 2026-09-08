import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.ayush import AyushAssessmentModel
from app.models.intake import ClinicalStateModel, IntakeSession
from app.models.user import Patient
from app.schemas.ayush import (
    AyushAssessment,
    AyushAssessmentStatus,
    AyushProvenanceSource,
    format_vaya_from_age,
)
from app.schemas.clinical_state import ClinicalState
from app.services.clinical_ai.domain_classifier import (
    ClinicalDomain,
    classify_clinical_domains,
)
from app.services.clinical_ai.question_scorer import (
    is_field_already_resolved,
    score_candidate_dimensions,
)


# ==============================================================================
# 1. AYUSH DYNAMIC CLINICAL DOMAIN CLASSIFICATION TESTS
# ==============================================================================

def test_ayush_workflow_identifies_cardiac_domain():
    """Verify AYUSH workflow with chest pain symptoms identifies CARDIAC while preserving AYUSH."""
    state = ClinicalState(
        chief_complaint="severe crushing chest pressure radiating to left arm",
        location="Chest",
    )
    domains = classify_clinical_domains(state, workflow_type="AYUSH")

    # AYUSH must be active
    assert ClinicalDomain.AYUSH in domains
    assert domains[0] == ClinicalDomain.AYUSH

    # CARDIAC must be identified from symptoms
    assert ClinicalDomain.CARDIAC in domains


def test_ayush_workflow_identifies_respiratory_domain():
    """Verify AYUSH workflow with cough/breathing difficulty identifies RESPIRATORY."""
    state = ClinicalState(
        chief_complaint="chronic dry cough and breathlessness since 2 weeks",
        location="Chest / Respiratory",
    )
    domains = classify_clinical_domains(state, workflow_type="AYUSH")

    assert ClinicalDomain.AYUSH in domains
    assert domains[0] == ClinicalDomain.AYUSH
    assert ClinicalDomain.RESPIRATORY in domains


def test_ayush_workflow_identifies_musculoskeletal_domain():
    """Verify AYUSH workflow with joint/knee symptoms identifies MUSCULOSKELETAL."""
    state = ClinicalState(
        chief_complaint="severe knee joint pain and morning stiffness in both joints",
        location="Knee / Joint",
    )
    domains = classify_clinical_domains(state, workflow_type="AYUSH")

    assert ClinicalDomain.AYUSH in domains
    assert domains[0] == ClinicalDomain.AYUSH
    assert ClinicalDomain.MUSCULOSKELETAL in domains
    # GASTROINTESTINAL should NOT be falsely forced when only joint symptoms exist
    assert ClinicalDomain.GASTROINTESTINAL not in domains


def test_ayush_workflow_identifies_gi_domain():
    """Verify AYUSH workflow with stomach pain/acidity identifies GASTROINTESTINAL."""
    state = ClinicalState(
        chief_complaint="burning stomach pain, acidity and bloating after meals",
        location="Abdomen",
    )
    domains = classify_clinical_domains(state, workflow_type="AYUSH")

    assert ClinicalDomain.AYUSH in domains
    assert domains[0] == ClinicalDomain.AYUSH
    assert ClinicalDomain.GASTROINTESTINAL in domains


def test_ayush_context_always_present_in_ayush_workflow():
    """Verify AYUSH context is always primary even when no specific symptom domain triggers."""
    state = ClinicalState(chief_complaint="general weakness and fatigue")
    domains = classify_clinical_domains(state, workflow_type="AYUSH")

    assert ClinicalDomain.AYUSH in domains
    assert domains[0] == ClinicalDomain.AYUSH
    assert ClinicalDomain.GENERAL in domains


def test_general_clinical_workflow_remains_unchanged():
    """Verify GENERAL_CLINICAL workflow never includes AYUSH domain."""
    state_eye = ClinicalState(chief_complaint="redness in right eye with discharge", location="Eyes")
    domains_eye = classify_clinical_domains(state_eye, workflow_type="GENERAL_CLINICAL")
    assert ClinicalDomain.OPHTHALMIC in domains_eye
    assert ClinicalDomain.AYUSH not in domains_eye

    state_cardiac = ClinicalState(chief_complaint="chest pressure and sweating")
    domains_cardiac = classify_clinical_domains(state_cardiac, workflow_type="GENERAL_CLINICAL")
    assert ClinicalDomain.CARDIAC in domains_cardiac
    assert ClinicalDomain.AYUSH not in domains_cardiac


# ==============================================================================
# 2. DEMOGRAPHICS -> VAYA BRIDGE TESTS
# ==============================================================================

def test_format_vaya_from_age_helper():
    """Verify canonical Ayurvedic Vaya stage classification."""
    assert format_vaya_from_age(8) == "8 years (Bala)"
    assert format_vaya_from_age(15) == "15 years (Bala)"
    assert format_vaya_from_age(16) == "16 years (Madhya)"
    assert format_vaya_from_age(45) == "45 years (Madhya)"
    assert format_vaya_from_age(60) == "60 years (Madhya)"
    assert format_vaya_from_age(65) == "65 years (Vriddha)"
    assert format_vaya_from_age(78) == "78 years (Vriddha)"


def test_known_patient_age_resolves_and_suppresses_vaya(client: TestClient, db: Session):
    """
    When patient_age is provided during intake creation:
    1. ClinicalState initializes vaya as KNOWN_WITH_VALUE.
    2. is_field_already_resolved('vaya') returns True.
    3. Candidate scoring applies the -500 penalty to vaya.
    4. Vaya is excluded from viable candidates.
    """
    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Ramesh Gupta",
        "patient_age": 58,
        "patient_gender": "Male",
        "workflow_type": "AYUSH",
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert create_res.status_code == 200
    data = create_res.json()
    intake_id = data["id"]

    # Verify ClinicalState model has vaya resolved
    state_model = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == intake_id).first()
    state = ClinicalState(**state_model.state_json)

    assert state.is_dimension_sufficiently_known("vaya")
    assert is_field_already_resolved("vaya", state)
    assert "vaya" in state.resolved_dimensions
    assert state.dimension_status.get("vaya") == "RESOLVED"
    assert "58 years (Madhya)" in state.canonical_dimensions["vaya"].value

    # Verify candidate scoring suppresses vaya with -500 penalty
    candidates = score_candidate_dimensions([ClinicalDomain.AYUSH], state, [])
    vaya_cand = next(c for c in candidates if c["field_name"] == "vaya")
    assert vaya_cand["score"] < 0, f"Expected negative score for resolved vaya, got {vaya_cand['score']}"
    assert vaya_cand["score"] == 15 + 35 - 500  # -450


def test_unknown_patient_age_leaves_vaya_eligible(client: TestClient, db: Session):
    """
    When patient_age is NOT provided:
    1. ClinicalState does NOT resolve vaya.
    2. is_field_already_resolved('vaya') returns False.
    3. Candidate score for vaya remains positive (50).
    4. Vaya remains eligible.
    """
    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Anonymous Patient",
        "patient_age": None,
        "workflow_type": "AYUSH",
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert create_res.status_code == 200
    data = create_res.json()
    intake_id = data["id"]

    state_model = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == intake_id).first()
    state = ClinicalState(**state_model.state_json)

    assert not state.is_dimension_sufficiently_known("vaya")
    assert not is_field_already_resolved("vaya", state)
    assert "vaya" not in state.resolved_dimensions

    candidates = score_candidate_dimensions([ClinicalDomain.AYUSH], state, [])
    vaya_cand = next(c for c in candidates if c["field_name"] == "vaya")
    assert vaya_cand["score"] == 50  # Base 15 + Domain 35
    assert vaya_cand["score"] > 0


def test_ayush_assessment_model_reflects_demographic_vaya(client: TestClient, db: Session):
    """Verify AyushAssessmentModel is seeded with demographic vaya as PATIENT_STATED."""
    create_res = client.post("/api/v1/intakes", json={
        "patient_name": "Shri Ram Prasad",
        "patient_age": 72,
        "workflow_type": "AYUSH",
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert create_res.status_code == 200
    intake_id = create_res.json()["id"]

    ayush_model = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == intake_id).first()
    assert ayush_model is not None
    assessment = AyushAssessment(**ayush_model.assessment_json)

    vaya_dim = assessment.vaya
    assert vaya_dim is not None
    assert "72 years (Vriddha)" in vaya_dim.value
    assert vaya_dim.source == AyushProvenanceSource.SYSTEM_DERIVED
    assert vaya_dim.status == AyushAssessmentStatus.PRELIMINARY


def test_existing_session_with_known_demographics_bridged_on_answer(client: TestClient, db: Session):
    """Verify that if an existing session had demographic age, process_intake_answer_core bridges it safely."""
    # Create patient with age
    pat = Patient(display_name="Existing Pat", age=35, gender="Female")
    db.add(pat)
    db.flush()

    # Create intake referencing patient
    create_res = client.post("/api/v1/intakes", json={
        "patient_id": pat.id,
        "workflow_type": "AYUSH",
        "language_code": "en",
        "interaction_mode": "TEXT"
    })
    assert create_res.status_code == 200
    intake_id = create_res.json()["id"]

    # Submit answer
    ans_res = client.post(f"/api/v1/intakes/{intake_id}/answers", json={
        "raw_text": "I have knee pain for 1 week.",
        "input_mode": "TEXT",
        "language_code": "en"
    })
    assert ans_res.status_code == 200
    ans_data = ans_res.json()

    state = ClinicalState(**ans_data["clinical_state"])
    assert state.is_dimension_sufficiently_known("vaya")
    assert is_field_already_resolved("vaya", state)
    assert "35 years (Madhya)" in state.canonical_dimensions["vaya"].value
