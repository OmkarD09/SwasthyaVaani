import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.models.document import (
    DocumentExtractionModel,
    DocumentModel,
)
from app.models.intake import ClinicalStateModel, IntakeSession
from app.models.user import Doctor, Hospital, Patient


@pytest.fixture
def hospital_and_doctor(db):
    h = Hospital(id="test-hosp-state-1", name="Civil District Hospital", code="CDH01")
    d = Doctor(
        id="test-doc-state-1",
        hospital_id=h.id,
        display_name="Dr. Rajiv Sharma",
        specialization="General Medicine",
    )
    db.add_all([h, d])
    db.commit()
    return h, d


def test_doctor_summary_invalid_id_returns_404(client: TestClient, auth_headers):
    """Verifies that non-existent patient ID returns 404, not 500."""
    headers = auth_headers("DOCTOR")
    res = client.get("/api/v1/doctor/patients/non-existent-uuid-99999", headers=headers)
    assert res.status_code == 404
    assert "not found" in res.json().get("detail", "").lower()


def test_doctor_summary_patient_with_no_documents(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies patient with complete intake but zero documents returns 200 with empty document list."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")
    
    p = Patient(id="pt-nodoc-01", display_name="No Doc Patient", age=30, gender="Female")
    session = IntakeSession(
        id="intake-nodoc-01",
        token="T-NODOC",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        language_code="en",
        workflow_type="GENERAL",
        started_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "Headache", "symptoms": ["headache"]},
    )
    db.add_all([p, session, cstate])
    db.commit()

    res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["intake_session_id"] == session.id
    assert data["patient_name"] == "No Doc Patient"
    assert data["documents"] == []
    assert data["medical_records"] == []
    assert data["clinical_state"]["chief_complaint"] == "Headache"


def test_doctor_summary_patient_with_pending_ocr(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies patient with uploaded document in PENDING state returns 200 without crashing."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-pending-01", display_name="Pending OCR Patient", age=45, gender="Male")
    session = IntakeSession(
        id="intake-pending-01",
        token="T-PENDING",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        language_code="en",
        started_at=datetime.now(timezone.utc),
    )
    doc = DocumentModel(
        id="doc-pending-01",
        patient_id=p.id,
        intake_session_id=session.id,
        file_name="pending_report.pdf",
        storage_object_id="storage-pending-01",
        mime_type="application/pdf",
        file_size=2048,
        sha256="a" * 64,
        page_count=1,
        document_type="LAB_REPORT",
        status="PENDING",
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add_all([p, session, doc])
    db.commit()

    res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["documents"]) == 1
    assert data["documents"][0]["name"] == "pending_report.pdf"
    assert data["documents"][0]["status"] == "PENDING"
    assert data["documents"][0]["extractions"] == []


def test_doctor_summary_patient_with_failed_ocr(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies patient with document in PROCESSING_FAILED state returns 200 with failure details."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-failed-01", display_name="Failed OCR Patient", age=52, gender="Other")
    session = IntakeSession(
        id="intake-failed-01",
        token="T-FAILED",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        language_code="hi",
        started_at=datetime.now(timezone.utc),
    )
    doc = DocumentModel(
        id="doc-failed-01",
        patient_id=p.id,
        intake_session_id=session.id,
        file_name="corrupted_image.png",
        storage_object_id="storage-failed-01",
        mime_type="image/png",
        file_size=512,
        sha256="b" * 64,
        page_count=1,
        document_type="PRESCRIPTION",
        status="PROCESSING_FAILED",
        failure_code="IMAGE_CORRUPTED",
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add_all([p, session, doc])
    db.commit()

    res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["documents"]) == 1
    assert data["documents"][0]["status"] == "PROCESSING_FAILED"
    assert data["documents"][0]["failure_code"] == "IMAGE_CORRUPTED"


def test_doctor_summary_patient_with_extractions(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies patient with processed extractions returns 200 with structured data."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-ext-01", display_name="Extracted Patient", age=60, gender="Male")
    session = IntakeSession(
        id="intake-ext-01",
        token="T-EXTRACTED",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        language_code="en",
        started_at=datetime.now(timezone.utc),
    )
    doc = DocumentModel(
        id="doc-ext-01",
        patient_id=p.id,
        intake_session_id=session.id,
        file_name="blood_test.pdf",
        storage_object_id="storage-ext-01",
        mime_type="application/pdf",
        file_size=150000,
        sha256="c" * 64,
        page_count=1,
        document_type="LAB_REPORT",
        status="COMPLETED",
        uploaded_at=datetime.now(timezone.utc),
    )
    ext = DocumentExtractionModel(
        id="ext-01",
        document_id=doc.id,
        field_type="INVESTIGATION",
        field_name="Hemoglobin",
        value_json={"test_name": "Hemoglobin", "value": "13.5", "unit": "g/dL"},
        confidence=0.95,
        ocr_confidence=0.92,
        extraction_confidence=0.95,
        ocr_engine="PADDLE_OCR",
        ocr_engine_version="2.7.3",
        extractor_version="1.0.0",
        source_page=1,
        original_source_text="Hemoglobin: 13.5 g/dL",
        status="EXTRACTED",
        created_at=datetime.now(timezone.utc),
    )
    db.add_all([p, session, doc, ext])
    db.commit()

    res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["documents"]) == 1
    assert len(data["documents"][0]["extractions"]) == 1
    assert len(data["medical_records"]) == 1
    assert data["medical_records"][0]["field_name"] == "Hemoglobin"
    assert data["medical_records"][0]["ocr_confidence"] == 0.92


def test_doctor_summary_minimal_or_empty_clinical_state(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies patient with missing/null clinical state and minimal optional data doesn't crash."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-bare-01", display_name="Bare Patient", age=None, gender=None)
    session = IntakeSession(
        id="intake-bare-01",
        token="T-BARE",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="WAITING",
        language_code="en",
        started_at=None,
        submitted_at=None,
    )
    db.add_all([p, session])
    db.commit()

    res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["intake_session_id"] == session.id
    assert data["patient_name"] == "Bare Patient"
    assert data["hospital_name"] == "Civil District Hospital"
    assert data["doctor_name"] == "Dr. Rajiv Sharma"
    assert data["clinical_state"]["symptoms"] == []
    assert data["documents"] == []


def test_patient_automatic_movement_from_live_queue_to_reviewed_queue(client: TestClient, db, hospital_and_doctor, auth_headers):
    """Verifies that confirming a patient removes them from the live queue and moves them to the reviewed queue."""
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    p = Patient(id="pt-move-01", display_name="Ramesh Kumar", age=42, gender="Male")
    session = IntakeSession(
        id="intake-move-01",
        token="T-MOVE01",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        review_status="PENDING_REVIEW",
        language_code="hi",
        workflow_type="GENERAL",
        started_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={"chief_complaint": "Severe fever and chills", "symptoms": ["fever", "chills"]},
    )
    db.add_all([p, session, cstate])
    db.commit()

    # 1. Check live queue: patient must be present
    live_res = client.get("/api/v1/doctor/queue", headers=headers)
    assert live_res.status_code == 200
    live_items = live_res.json()
    assert any(item["intake_session_id"] == session.id for item in live_items)

    # 2. Check reviewed queue: patient must NOT be present
    rev_res = client.get("/api/v1/doctor/patients/reviewed", headers=headers)
    assert rev_res.status_code == 200
    rev_items = rev_res.json()
    assert not any(item["intake_session_id"] == session.id for item in rev_items)

    # 3. Doctor confirms clinical record
    confirm_payload = {
        "notes": "Patient advised paracetamol and complete bed rest.",
        "edits": [],
        "generate_fhir": False,
    }
    confirm_res = client.post(f"/api/v1/doctor/patients/{session.id}/confirm", json=confirm_payload, headers=headers)
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["review_status"] == "REVIEWED"
    assert confirm_data["status"] == "PHYSICIAN_CONFIRMED"

    # 4. Check live queue: patient must now be ABSENT (automatically moved)
    live_res_after = client.get("/api/v1/doctor/queue", headers=headers)
    assert live_res_after.status_code == 200
    live_items_after = live_res_after.json()
    assert not any(item["intake_session_id"] == session.id for item in live_items_after)

    # 5. Check reviewed queue: patient must now be PRESENT
    rev_res_after = client.get("/api/v1/doctor/patients/reviewed", headers=headers)
    assert rev_res_after.status_code == 200
    rev_items_after = rev_res_after.json()
    matching_rev = [item for item in rev_items_after if item["intake_session_id"] == session.id]
    assert len(matching_rev) == 1
    assert matching_rev[0]["review_status"] == "REVIEWED"
    assert matching_rev[0]["patient_name"] == "Ramesh Kumar"

    # 6. Check detail endpoint: review_status must be REVIEWED
    detail_res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["review_status"] == "REVIEWED"
    assert detail_data["clinician_notes"] == "Patient advised paracetamol and complete bed rest."

