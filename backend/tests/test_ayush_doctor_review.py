import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.models.ayush import AyushAssessmentModel
from app.models.intake import ClinicalStateModel, IntakeSession
from app.models.review import AuditEventModel, PhysicianEditModel, PhysicianReviewModel
from app.models.user import Doctor, Hospital, Patient
from app.schemas.ayush import (
    AyushAssessment,
    AyushAssessmentStatus,
    AyushDimensionValue,
    AyushProvenanceSource,
    format_vaya_from_age,
)
from app.services.fhir.mapper import map_clinical_state_to_fhir_r4
from app.schemas.clinical_state import ClinicalState, AyushState


@pytest.fixture
def hospital_and_doctor(db):
    h = Hospital(id="test-hosp-ayush-1", name="Ayurveda Research Hospital", code="ARH01")
    d = Doctor(
        id="test-doc-ayush-1",
        hospital_id=h.id,
        display_name="Vaidya Ananya Deshmukh",
        specialization="Ayurveda Medicine",
    )
    db.add_all([h, d])
    db.commit()
    return h, d


def test_doctor_patient_detail_returns_ayush_assessment(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies that doctor detail endpoint returns structured AyushAssessment from database."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-ayush-01", display_name="Rajesh Gupta", age=52, gender="Male")
    session = IntakeSession(
        id="intake-ayush-01",
        token="T-AYU01",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        language_code="hi",
        workflow_type="AYUSH",
        started_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "chronic indigestion and joint stiffness"},
    )
    ayush_obj = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.PRELIMINARY,
        agni=AyushDimensionValue(
            dimension="agni",
            value="Manda",
            source=AyushProvenanceSource.PATIENT_STATED,
            confidence=0.9,
        ),
        prakriti=AyushDimensionValue(
            dimension="prakriti",
            value="Vata-Kapha",
            source=AyushProvenanceSource.AI_INFERRED,
            confidence=0.75,
        ),
        vaya=AyushDimensionValue(
            dimension="vaya",
            value=format_vaya_from_age(52),
            source=AyushProvenanceSource.PATIENT_STATED,
            confidence=1.0,
        ),
    )
    ayush_model = AyushAssessmentModel(
        intake_session_id=session.id,
        system="AYURVEDA",
        status=ayush_obj.overall_status.value,
        assessment_json=ayush_obj.model_dump(mode="json"),
    )
    db.add_all([p, session, cstate, ayush_model])
    db.commit()

    res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "ayush_assessment" in data
    ayush_res = data["ayush_assessment"]
    assert ayush_res is not None
    assert ayush_res["system"] == "AYURVEDA"
    assert ayush_res["overall_status"] == "PRELIMINARY"
    assert ayush_res["agni"]["value"] == "Manda"
    assert ayush_res["agni"]["source"] == "PATIENT_STATED"
    assert ayush_res["prakriti"]["value"] == "Vata-Kapha"
    assert ayush_res["prakriti"]["source"] == "AI_INFERRED"
    assert "52 years (Madhya)" in ayush_res["vaya"]["value"]


def test_doctor_patient_detail_adapts_legacy_ayush_state(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies backward compatibility: adapts legacy ClinicalState.ayush if AyushAssessmentModel is not present."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-ayush-legacy", display_name="Sita Devi", age=45, gender="Female")
    session = IntakeSession(
        id="intake-ayush-legacy",
        token="T-LEGACY",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        language_code="mr",
        workflow_type="AYUSH",
        started_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={
            "chief_complaint": "hyperacidity",
            "ayush": {
                "agni": "Tikshna",
                "koshtha": "Mridu",
                "prakriti": "Pitta",
            }
        },
    )
    db.add_all([p, session, cstate])
    db.commit()

    res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    ayush_res = data.get("ayush_assessment")
    assert ayush_res is not None
    assert ayush_res["agni"]["value"] == "Tikshna"
    assert ayush_res["koshtha"]["value"] == "Mridu"
    assert ayush_res["prakriti"]["value"] == "Pitta"


def test_expanded_dashavidha_dimensions_serialized_with_provenance(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies that expanded Dashavidha dimensions serialize properly with provenance and confidence."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-ayush-dasha", display_name="Vikram Rao", age=28, gender="Male")
    session = IntakeSession(
        id="intake-ayush-dasha",
        token="T-DASHA",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        workflow_type="AYUSH",
        started_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "low stamina and digestive trouble"},
    )
    ayush_obj = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.PRELIMINARY,
        sara=AyushDimensionValue(
            dimension="sara",
            value="Madhyama Sara (Moderate tissue quality)",
            source=AyushProvenanceSource.PATIENT_STATED,
            confidence=0.85,
        ),
        sattva=AyushDimensionValue(
            dimension="sattva",
            value="Pravara (Strong mental resilience)",
            source=AyushProvenanceSource.AI_INFERRED,
            confidence=0.7,
        ),
        vyayama_shakti=AyushDimensionValue(
            dimension="vyayama_shakti",
            value="Avara (Low exercise tolerance)",
            source=AyushProvenanceSource.PATIENT_STATED,
            confidence=0.9,
        ),
    )
    ayush_model = AyushAssessmentModel(
        intake_session_id=session.id,
        system="AYURVEDA",
        status=ayush_obj.overall_status.value,
        assessment_json=ayush_obj.model_dump(mode="json"),
    )
    db.add_all([p, session, cstate, ayush_model])
    db.commit()

    res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert res.status_code == 200
    ayush_res = res.json()["ayush_assessment"]
    assert ayush_res["sara"]["value"] == "Madhyama Sara (Moderate tissue quality)"
    assert ayush_res["sara"]["source"] == "PATIENT_STATED"
    assert ayush_res["sattva"]["source"] == "AI_INFERRED"
    assert ayush_res["vyayama_shakti"]["value"] == "Avara (Low exercise tolerance)"


def test_physician_confirmation_transitions_assessment_status(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies that POST /confirm updates AyushAssessmentModel.status to PHYSICIAN_CONFIRMED."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-ayush-conf", display_name="Amitabh Sen", age=61, gender="Male")
    session = IntakeSession(
        id="intake-ayush-conf",
        token="T-CONF01",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        workflow_type="AYUSH",
        started_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "chronic fatigue", "ayush": {"agni": "Manda"}},
    )
    ayush_obj = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.PRELIMINARY,
        agni=AyushDimensionValue(
            dimension="agni",
            value="Manda",
            source=AyushProvenanceSource.PATIENT_STATED,
        ),
    )
    ayush_model = AyushAssessmentModel(
        intake_session_id=session.id,
        system="AYURVEDA",
        status="PRELIMINARY",
        assessment_json=ayush_obj.model_dump(mode="json"),
    )
    db.add_all([p, session, cstate, ayush_model])
    db.commit()

    # Call confirm without AYUSH edits
    confirm_payload = {
        "intake_session_id": session.id,
        "notes": "Reviewed and verified patient clinical history.",
        "edits": [],
        "generate_fhir": True,
    }
    res = client.post(f"/api/v1/doctor/patients/{session.id}/confirm", json=confirm_payload, headers=headers)
    assert res.status_code == 200

    # Verify AyushAssessmentModel status updated to PHYSICIAN_CONFIRMED
    updated_ayush = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assert updated_ayush is not None
    assert updated_ayush.status == "PHYSICIAN_CONFIRMED"
    assert updated_ayush.assessment_json["overall_status"] == "PHYSICIAN_CONFIRMED"

    # Verify unedited dimension retains original provenance (PATIENT_STATED)
    assert updated_ayush.assessment_json["agni"]["source"] == "PATIENT_STATED"


def test_physician_edits_update_ayush_dimensions_explicitly(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies that only explicitly edited AYUSH dimensions receive PHYSICIAN_CONFIRMED source and status."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-ayush-edit", display_name="Meera Joshi", age=38, gender="Female")
    session = IntakeSession(
        id="intake-ayush-edit",
        token="T-EDIT01",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        workflow_type="AYUSH",
        started_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "digestive irregularities", "ayush": {"agni": "Vishama", "koshtha": "Krura"}},
    )
    ayush_obj = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.PRELIMINARY,
        agni=AyushDimensionValue(
            dimension="agni",
            value="Vishama",
            source=AyushProvenanceSource.PATIENT_STATED,
            status=AyushAssessmentStatus.PRELIMINARY,
        ),
        koshtha=AyushDimensionValue(
            dimension="koshtha",
            value="Krura",
            source=AyushProvenanceSource.PATIENT_STATED,
            status=AyushAssessmentStatus.PRELIMINARY,
        ),
        prakriti=AyushDimensionValue(
            dimension="prakriti",
            value="Vata-Pitta",
            source=AyushProvenanceSource.AI_INFERRED,
            status=AyushAssessmentStatus.PRELIMINARY,
        ),
    )
    ayush_model = AyushAssessmentModel(
        intake_session_id=session.id,
        system="AYURVEDA",
        status="PRELIMINARY",
        assessment_json=ayush_obj.model_dump(mode="json"),
    )
    db.add_all([p, session, cstate, ayush_model])
    db.commit()

    # Physician explicitly edits agni to Samagni and corrects reason
    confirm_payload = {
        "intake_session_id": session.id,
        "notes": "Patient clarifies appetite is regular under controlled diet.",
        "edits": [
            {
                "field_name": "agni",
                "old_value": "Vishama",
                "new_value": "Samagni",
                "reason": "Physical examination confirms balanced appetite and assimilation.",
            }
        ],
        "generate_fhir": True,
    }
    res = client.post(f"/api/v1/doctor/patients/{session.id}/confirm", json=confirm_payload, headers=headers)
    assert res.status_code == 200

    updated_ayush = db.query(AyushAssessmentModel).filter(AyushAssessmentModel.intake_session_id == session.id).first()
    assert updated_ayush is not None
    ajson = updated_ayush.assessment_json

    # 1. Edited dimension MUST have PHYSICIAN_CONFIRMED source and status
    assert ajson["agni"]["value"] == "Samagni"
    assert ajson["agni"]["source"] == "PHYSICIAN_CONFIRMED"
    assert ajson["agni"]["status"] == "PHYSICIAN_CONFIRMED"

    # 2. Unedited dimension (koshtha) MUST preserve original PATIENT_STATED source
    assert ajson["koshtha"]["value"] == "Krura"
    assert ajson["koshtha"]["source"] == "PATIENT_STATED"

    # 3. Unedited AI_INFERRED dimension (prakriti) MUST preserve AI_INFERRED source
    assert ajson["prakriti"]["value"] == "Vata-Pitta"
    assert ajson["prakriti"]["source"] == "AI_INFERRED"


def test_physician_edits_generate_audit_trail(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies that physician edits to AYUSH fields are persisted in PhysicianEditModel and AuditEventModel."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-ayush-audit", display_name="Gopal Varma", age=42, gender="Male")
    session = IntakeSession(
        id="intake-ayush-audit",
        token="T-AUDIT01",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        workflow_type="AYUSH",
        started_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "acidity"},
    )
    ayush_obj = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.PRELIMINARY,
        agni=AyushDimensionValue(dimension="agni", value="Manda", source=AyushProvenanceSource.PATIENT_STATED),
    )
    ayush_model = AyushAssessmentModel(
        intake_session_id=session.id,
        system="AYURVEDA",
        status="PRELIMINARY",
        assessment_json=ayush_obj.model_dump(mode="json"),
    )
    db.add_all([p, session, cstate, ayush_model])
    db.commit()

    confirm_payload = {
        "intake_session_id": session.id,
        "notes": "Adjusted Agni based on clinical exam.",
        "edits": [
            {
                "field_name": "ayush.agni",
                "old_value": "Manda",
                "new_value": "Tikshna",
                "reason": "Burning sensation after meals indicates Tikshnagni.",
            }
        ],
        "generate_fhir": True,
    }
    res = client.post(f"/api/v1/doctor/patients/{session.id}/confirm", json=confirm_payload, headers=headers)
    assert res.status_code == 200

    # Check PhysicianReviewModel
    review = db.query(PhysicianReviewModel).filter(PhysicianReviewModel.intake_session_id == session.id).first()
    assert review is not None
    assert review.status == "CONFIRMED"

    # Check PhysicianEditModel
    edits = db.query(PhysicianEditModel).filter(PhysicianEditModel.physician_review_id == review.id).all()
    assert len(edits) >= 1
    ayush_edit = next(e for e in edits if "agni" in e.field_name)
    assert ayush_edit.old_value_json == {"value": "Manda"}
    assert ayush_edit.new_value_json == {"value": "Tikshna"}
    assert "Tikshnagni" in ayush_edit.reason

    # Check AuditEventModel
    audits = db.query(AuditEventModel).filter(AuditEventModel.resource_id == session.id).all()
    assert any(a.event_type == "PHYSICIAN_CONFIRMED" for a in audits)


def test_legacy_clinical_state_ayush_remains_synced(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies that editing core AYUSH dimensions also updates ClinicalState.ayush for backward compatibility."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-ayush-sync", display_name="Pooja Patel", age=29, gender="Female")
    session = IntakeSession(
        id="intake-ayush-sync",
        token="T-SYNC01",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        workflow_type="AYUSH",
        started_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "indigestion", "ayush": {"koshtha": "Madhyam"}},
    )
    ayush_obj = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.PRELIMINARY,
        koshtha=AyushDimensionValue(dimension="koshtha", value="Madhyam", source=AyushProvenanceSource.PATIENT_STATED),
    )
    ayush_model = AyushAssessmentModel(
        intake_session_id=session.id,
        system="AYURVEDA",
        status="PRELIMINARY",
        assessment_json=ayush_obj.model_dump(mode="json"),
    )
    db.add_all([p, session, cstate, ayush_model])
    db.commit()

    confirm_payload = {
        "intake_session_id": session.id,
        "notes": "Verified bowel habit.",
        "edits": [{"field_name": "koshtha", "old_value": "Madhyam", "new_value": "Krura", "reason": "Severe constipation"}],
        "generate_fhir": False,
    }
    res = client.post(f"/api/v1/doctor/patients/{session.id}/confirm", json=confirm_payload, headers=headers)
    assert res.status_code == 200

    updated_cstate = db.query(ClinicalStateModel).filter(ClinicalStateModel.intake_session_id == session.id).first()
    assert updated_cstate.state_json["ayush"]["koshtha"] == "Krura"


def test_fhir_mapping_includes_confirmed_ayush_observations():
    """Verifies that FHIR mapper exports only physician-confirmed AYUSH observations with practitioner attribution."""
    state = ClinicalState(chief_complaint="dyspepsia", duration="2 weeks")
    assessment = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.PHYSICIAN_CONFIRMED,
        # agni is physician confirmed -> should be exported
        agni=AyushDimensionValue(
            dimension="agni",
            value="Tikshna",
            source=AyushProvenanceSource.PHYSICIAN_CONFIRMED,
            status=AyushAssessmentStatus.PHYSICIAN_CONFIRMED,
        ),
        # prakriti is AI inferred and unconfirmed -> should NOT be exported
        prakriti=AyushDimensionValue(
            dimension="prakriti",
            value="Pitta-Kapha",
            source=AyushProvenanceSource.AI_INFERRED,
            status=AyushAssessmentStatus.PRELIMINARY,
        ),
    )

    bundle = map_clinical_state_to_fhir_r4(
        intake_session_id="session-fhir-01",
        patient_id="patient-fhir-01",
        patient_name="Anil Kumar",
        doctor_name="Dr. Rajiv Sharma",
        state=state,
        ayush_assessment=assessment,
    )

    entries = bundle.entry
    observation_resources = [e["resource"] for e in entries if e["resource"]["resourceType"] == "Observation"]

    # Agni observation should be present with Practitioner attribution
    agni_obs = next((o for o in observation_resources if o.get("code", {}).get("text") == "Ayurveda Agni Assessment"), None)
    assert agni_obs is not None
    assert agni_obs["valueString"] == "Tikshna"
    assert "performer" in agni_obs
    assert agni_obs["performer"][0]["display"] == "Dr. Rajiv Sharma"

    # Prakriti observation should NOT be exported because it was AI_INFERRED / PRELIMINARY
    prakriti_obs = next((o for o in observation_resources if o.get("code", {}).get("text") == "Ayurveda Prakriti Assessment"), None)
    assert prakriti_obs is None


def test_unresolved_dimensions_handle_gracefully(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies that unassessed dimensions serialize safely as None without error."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-ayush-sparse", display_name="Kavita Rao", age=24, gender="Female")
    session = IntakeSession(
        id="intake-ayush-sparse",
        token="T-SPARSE",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        workflow_type="AYUSH",
        started_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "migraine"},
    )
    ayush_obj = AyushAssessment(
        system="AYURVEDA",
        overall_status=AyushAssessmentStatus.INCOMPLETE,
    )
    ayush_model = AyushAssessmentModel(
        intake_session_id=session.id,
        system="AYURVEDA",
        status="INCOMPLETE",
        assessment_json=ayush_obj.model_dump(mode="json"),
    )
    db.add_all([p, session, cstate, ayush_model])
    db.commit()

    res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert res.status_code == 200
    ayush_res = res.json()["ayush_assessment"]
    assert ayush_res["agni"] is None
    assert ayush_res["koshtha"] is None
    assert ayush_res["sara"] is None
    assert ayush_res["overall_status"] == "INCOMPLETE"
