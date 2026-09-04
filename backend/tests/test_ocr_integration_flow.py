from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.models.document import DocumentExtractionModel, DocumentModel
from app.models.intake import IntakeSession
from app.models.user import Doctor, Hospital, Patient
from app.services.providers.ocr_provider import MockOCRProvider

SAMPLE_PDF_BYTES = (
    b"%PDF-1.4\n"
    b"% SYNTHETIC DEMO DOCUMENT - NOT A REAL PRESCRIPTION\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
    b"4 0 obj\n<< /Length 140 >>\nstream\n"
    b"BT /F1 12 Tf 72 720 Td (Synthetic Rx - Kunal Bharadi) Tj "
    b"0 -24 Td (Metformin 500 mg - 1 tab BD - 30 days) Tj ET\nendstream\nendobj\n"
    b"trailer\n<< /Root 1 0 R >>\n%%EOF\n"
)


@pytest.fixture
def intake_setup(db):
    hospital = Hospital(id="hosp-integration", name="City Care Hospital", code="CCH")
    doctor = Doctor(
        id="doc-integration",
        hospital_id=hospital.id,
        display_name="Dr. Priya Sharma",
        specialization="General Medicine",
    )
    patient = Patient(id="pat-integration-01", display_name="Ramesh Gupta")
    session = IntakeSession(
        id="intake-integration-01",
        token="T-999",
        patient_id=patient.id,
        hospital_id=hospital.id,
        doctor_id=doctor.id,
        status="SUBMITTED",
        language_code="en",
        workflow_type="GENERAL_MEDICINE",
    )
    db.add_all([hospital, doctor, patient, session])
    db.commit()
    return patient, session


def test_end_to_end_upload_ocr_doctor_reflection(client: TestClient, db, intake_setup, auth_headers):
    patient, session = intake_setup
    headers = auth_headers("DOCTOR")

    # Step 1: Patient uploads document
    upload_res = client.post(
        "/api/v1/documents/upload",
        data={
            "patient_id": patient.id,
            "intake_session_id": session.id,
            "document_type": "PRESCRIPTION",
            "auto_process": True,
        },
        files={
            "file": (
                "synthetic_prescription.pdf",
                SAMPLE_PDF_BYTES,
                "application/pdf",
            )
        },
    )
    assert upload_res.status_code == 202
    upload_data = upload_res.json()
    doc_id = upload_data["document_id"]
    assert upload_data["status"] == "PENDING"
    assert upload_data["storage_url"] == f"/api/v1/documents/{doc_id}/view"

    # Step 2: Background OCR ran automatically in TestClient
    doc_in_db = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
    assert doc_in_db is not None
    assert doc_in_db.status == "NEEDS_REVIEW"
    assert doc_in_db.processed_at is not None

    # Step 3: Extractions were persisted in DB
    extractions = db.query(DocumentExtractionModel).filter(DocumentExtractionModel.document_id == doc_id).all()
    assert len(extractions) > 0
    med_extraction = extractions[0]
    assert med_extraction.field_type in ["medications", "MEDICATION"]
    assert med_extraction.status == "NEEDS_REVIEW"

    # Step 4: Doctor retrieves clinical summary
    doctor_res = client.get(f"/api/v1/doctor/patients/{session.id}", headers=headers)
    assert doctor_res.status_code == 200
    detail = doctor_res.json()

    # Step 5: Document and extracted medical records are present
    docs = detail.get("documents", [])
    assert len(docs) == 1
    doc_info = docs[0]
    assert doc_info["id"] == doc_id
    assert doc_info["name"] == "synthetic_prescription.pdf"
    assert doc_info["status"] == "NEEDS_REVIEW"
    assert "extractions" in doc_info
    assert len(doc_info["extractions"]) > 0

    # Step 6: Detail includes medical_records aggregated list
    medical_records = detail.get("medical_records", [])
    assert len(medical_records) > 0
    assert medical_records[0]["document_id"] == doc_id
    assert medical_records[0]["confidence"] is not None

    # Step 7: Doctor calls re-process endpoint explicitly
    reprocess_res = client.post(f"/api/v1/documents/{doc_id}/process")
    assert reprocess_res.status_code == 200
    reprocess_data = reprocess_res.json()
    assert reprocess_data["status"] == "NEEDS_REVIEW"
    assert len(reprocess_data["extracted_facts"]) > 0
