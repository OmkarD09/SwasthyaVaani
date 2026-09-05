from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token
from app.models.document import DocumentModel
from app.models.intake import ClinicalStateModel, IntakeSession
from app.models.user import Doctor, Hospital, Patient

FIXTURES = Path(__file__).parent / "fixtures"
SAMPLE_PDF_BYTES = (FIXTURES / "synthetic_prescription.pdf").read_bytes()


@pytest.fixture(autouse=True)
def configure_storage(tmp_path, monkeypatch):
    storage_dir = tmp_path / "private_uploads"
    storage_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "DOCUMENT_STORAGE_DIR", str(storage_dir))
    monkeypatch.setattr(settings, "DOCUMENT_MAX_FILE_SIZE_BYTES", 10 * 1024 * 1024)
    monkeypatch.setattr(settings, "DOCUMENT_MAX_PAGE_COUNT", 20)


@pytest.fixture
def hospital_and_doctor(db):
    h = Hospital(id="test-hosp-1", name="District General Hospital", code="DGH01")
    d = Doctor(
        id="test-doc-1",
        hospital_id=h.id,
        display_name="Dr. Ananya Rao",
        specialization="General Medicine",
    )
    db.add_all([h, d])
    db.commit()
    return h, d


@pytest.fixture
def clinical_intake(db, hospital_and_doctor):
    h, d = hospital_and_doctor
    p = Patient(
        id="pt-synth-101",
        display_name="Ramesh Kumar",
        age=48,
        gender="Male",
    )
    session = IntakeSession(
        id="intake-synth-101",
        token="T-101",
        patient_id=p.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        language_code="hi",
        workflow_type="GENERAL_MEDICINE",
        started_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
    )
    cstate = ClinicalStateModel(
        intake_session_id=session.id,
        version=1,
        state_json={
            "chief_complaint": "Persistent cough and mild fever",
            "symptoms": ["cough", "fever"],
            "severity": 4,
            "duration": "5 days",
        },
    )
    db.add_all([p, session, cstate])
    db.commit()
    return p, session


def test_document_reflection_on_doctor_portal(client: TestClient, db, clinical_intake, auth_headers):
    patient, session = clinical_intake
    headers = auth_headers("DOCTOR")

    # 1. Patient uploads medical record
    upload_res = client.post(
        "/api/v1/documents/upload",
        data={
            "patient_id": patient.id,
            "intake_session_id": session.id,
            "document_type": "PRESCRIPTION",
        },
        files={
            "file": (
                "previous_prescription.pdf",
                SAMPLE_PDF_BYTES,
                "application/pdf",
            )
        },
    )
    assert upload_res.status_code == 202
    upload_data = upload_res.json()
    doc_id = upload_data["document_id"]
    assert upload_data["file_name"] == "previous_prescription.pdf"
    assert upload_data["status"] == "PENDING"
    assert upload_data["storage_url"] == f"/api/v1/documents/{doc_id}/view"

    # Verify DocumentModel in database
    doc_in_db = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
    assert doc_in_db is not None
    assert doc_in_db.patient_id == patient.id
    assert doc_in_db.intake_session_id == session.id

    # 2. Doctor fetches patient summary
    doctor_res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert doctor_res.status_code == 200
    doc_detail = doctor_res.json()

    # 3. Assert document reflects in doctor detail
    documents = doc_detail.get("documents", [])
    assert len(documents) == 1
    doc = documents[0]
    assert doc["id"] == doc_id
    assert doc["name"] == "previous_prescription.pdf"
    assert doc["file_name"] == "previous_prescription.pdf"
    assert doc["status"] in ["PENDING", "NEEDS_REVIEW"]
    assert "extractions" in doc
    assert "medical_records" in doc_detail
    assert doc["type"] == "prescription"
    assert doc["localOnly"] is False
    assert doc["url"] == f"/api/v1/documents/{doc_id}/view"
    assert "KB" in doc["size"] or "B" in doc["size"]


def test_document_inline_view_and_download(client: TestClient, clinical_intake, auth_headers):
    patient, session = clinical_intake
    headers = auth_headers("DOCTOR")

    # Upload document
    upload_res = client.post(
        "/api/v1/documents/upload",
        data={
            "patient_id": patient.id,
            "intake_session_id": session.id,
            "document_type": "PRESCRIPTION",
        },
        files={
            "file": (
                "test_report.pdf",
                SAMPLE_PDF_BYTES,
                "application/pdf",
            )
        },
    )
    assert upload_res.status_code == 202
    doc_id = upload_res.json()["document_id"]

    # View with Authorization header
    view_res = client.get(f"/api/v1/documents/{doc_id}/view", headers=headers)
    assert view_res.status_code == 200
    assert view_res.content == SAMPLE_PDF_BYTES
    assert view_res.headers["content-type"] == "application/pdf"
    assert 'inline; filename="test_report.pdf"' in view_res.headers["content-disposition"]

    # View via token query param (browser tab opening)
    token = create_access_token({"sub": "doc-1", "role": "DOCTOR"})
    view_token_res = client.get(f"/api/v1/documents/{doc_id}/view?token={token}")
    assert view_token_res.status_code == 200
    assert view_token_res.content == SAMPLE_PDF_BYTES

    # Download endpoint
    download_res = client.get(f"/api/v1/documents/{doc_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert download_res.content == SAMPLE_PDF_BYTES
    assert 'attachment; filename="test_report.pdf"' in download_res.headers["content-disposition"]


def test_unlinked_patient_upload_fallback(client: TestClient, clinical_intake, auth_headers):
    patient, session = clinical_intake
    headers = auth_headers("DOCTOR")

    # Upload without intake_session_id
    upload_res = client.post(
        "/api/v1/documents/upload",
        data={
            "patient_id": patient.id,
            "document_type": "LAB_REPORT",
        },
        files={
            "file": (
                "blood_report.pdf",
                SAMPLE_PDF_BYTES,
                "application/pdf",
            )
        },
    )
    assert upload_res.status_code == 202
    doc_id = upload_res.json()["document_id"]

    # Doctor requests patient detail — should automatically link and reflect the file
    doctor_res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert doctor_res.status_code == 200
    docs = doctor_res.json().get("documents", [])
    assert len(docs) == 1
    assert docs[0]["id"] == doc_id
    assert docs[0]["name"] == "blood_report.pdf"


def test_document_patient_isolation(client: TestClient, db, hospital_and_doctor, clinical_intake, auth_headers):
    patient_a, session_a = clinical_intake
    h, d = hospital_and_doctor
    headers = auth_headers("DOCTOR")

    # Create Patient B and Session B
    patient_b = Patient(id="pt-synth-202", display_name="Sita Devi")
    session_b = IntakeSession(
        id="intake-synth-202",
        token="T-202",
        patient_id=patient_b.id,
        hospital_id=h.id,
        doctor_id=d.id,
        status="SUBMITTED",
        language_code="hi",
        workflow_type="GENERAL_MEDICINE",
    )
    db.add_all([patient_b, session_b])
    db.commit()

    # Upload document for Patient A
    upload_res = client.post(
        "/api/v1/documents/upload",
        data={
            "patient_id": patient_a.id,
            "intake_session_id": session_a.id,
            "document_type": "PRESCRIPTION",
        },
        files={
            "file": (
                "patient_a_file.pdf",
                SAMPLE_PDF_BYTES,
                "application/pdf",
            )
        },
    )
    assert upload_res.status_code == 202

    # Doctor checks Patient B summary -> must NOT see Patient A's documents
    doc_b_res = client.get(f"/api/v1/doctor/patients/{session_b.id}", headers=headers)
    assert doc_b_res.status_code == 200
    docs_b = doc_b_res.json().get("documents", [])
    assert len(docs_b) == 0

    # Doctor checks Patient A summary -> must see Patient A's document
    doc_a_res = client.get(f"/api/v1/doctor/patients/{session_a.id}", headers=headers)
    assert doc_a_res.status_code == 200
    docs_a = doc_a_res.json().get("documents", [])
    assert len(docs_a) == 1
    assert docs_a[0]["name"] == "patient_a_file.pdf"
