import uuid
import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models.user import Patient, Doctor, Hospital
from app.models.intake import IntakeSession, ClinicalStateModel
from app.services.patient_id import generate_next_patient_display_id


def test_sequential_patient_display_id_generation(db: Session):
    """Verify that patients receive unique sequential P-prefixed IDs."""
    id1 = generate_next_patient_display_id(db)
    p1 = Patient(id=str(uuid.uuid4()), display_id=id1, display_name="Sequential Test Patient 1")
    db.add(p1)
    db.commit()

    id2 = generate_next_patient_display_id(db)
    p2 = Patient(id=str(uuid.uuid4()), display_id=id2, display_name="Sequential Test Patient 2")
    db.add(p2)
    db.commit()

    assert id1.startswith("P")
    assert id2.startswith("P")
    assert int(id2[1:]) == int(id1[1:]) + 1
    assert p1.display_id != p2.display_id


def test_patient_submission_assigns_simple_id(db: Session, client: TestClient):
    """Verify that when a patient is created with submit_now=True or submitted later, display_id is assigned."""
    unique_phone = f"99{uuid.uuid4().hex[:8]}"
    create_payload = {
        "patient_name": "New Submitted Patient",
        "patient_age": 42,
        "patient_gender": "Male",
        "phone": unique_phone,
        "workflow_type": "GENERAL_CLINICAL",
        "interaction_mode": "TEXT",
        "chief_complaint": "Persistent headache",
        "submit_now": True,
    }

    res = client.post("/api/v1/intakes", json=create_payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["display_id"] is not None
    assert data["display_id"].startswith("P")
    assert data["patient_display_id"] == data["display_id"]
    # Internal ID is still a valid UUID
    assert data["patient_id"] != data["display_id"]
    assert len(data["patient_id"]) >= 32

    # Verify intake detail retrieval includes display_id
    detail_res = client.get(f"/api/v1/intakes/{data['id']}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["display_id"] == data["display_id"]


def test_doctor_queue_and_reviewed_keeps_same_display_id(db: Session, client: TestClient, auth_headers):
    """Verify simple ID stays identical when moving from Live Queue to Reviewed."""
    headers = auth_headers("DOCTOR")
    p_uuid = str(uuid.uuid4())
    patient = Patient(
        id=p_uuid,
        display_name="Triage Test Patient",
        age=30,
        gender="Female",
    )
    db.add(patient)
    db.flush()

    session_id = str(uuid.uuid4())
    session = IntakeSession(
        id=session_id,
        token="T-999",
        patient_id=patient.id,
        hospital_id="hosp_district_01",
        doctor_id="doc_001",
        workflow_type="GENERAL_CLINICAL",
        status="SUBMITTED",
    )
    db.add(session)
    db.flush()

    cs = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "Fever and fatigue", "symptoms": ["Fever"]}
    )
    db.add(cs)
    db.commit()

    # Query doctor queue
    queue_res = client.get("/api/v1/doctor/queue", headers=headers)
    assert queue_res.status_code == 200, queue_res.text
    queue_items = queue_res.json()
    target_item = next((item for item in queue_items if item["intake_session_id"] == session_id), None)
    assert target_item is not None
    assigned_display_id = target_item["display_id"]
    assert assigned_display_id is not None
    assert assigned_display_id.startswith("P")

    # Retrieve patient clinical detail
    detail_res = client.get(f"/api/v1/doctor/patients/{session_id}", headers=headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["display_id"] == assigned_display_id
    assert detail_data["patient_id"] == p_uuid

    # Confirm / review patient
    confirm_res = client.post(
        f"/api/v1/doctor/patients/{session_id}/confirm",
        headers=headers,
        json={"intake_session_id": session_id, "notes": "Reviewed and confirmed", "edits": []}
    )
    assert confirm_res.status_code == 200

    # Query reviewed patients - display_id must remain identical
    reviewed_res = client.get("/api/v1/doctor/patients/reviewed", headers=headers)
    assert reviewed_res.status_code == 200
    reviewed_items = reviewed_res.json()
    reviewed_target = next((item for item in reviewed_items if item["intake_session_id"] == session_id), None)
    assert reviewed_target is not None
    assert reviewed_target["display_id"] == assigned_display_id
