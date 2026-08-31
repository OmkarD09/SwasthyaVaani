import io
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.services.providers.base import NormalizedOCRResult, OCRBlock
from app.services.document_intelligence.extractor import DocumentIntelligenceExtractor
from app.services.providers.ocr_provider import MockOCRProvider, PaddleOCRProvider
from app.services.providers.factory import ProviderRegistry, get_ocr_service
from app.seed.seed_data import seed_database


# --- Provider Unit Tests ---

@pytest.mark.asyncio
async def test_mock_ocr_provider_returns_normalized_entities():
    provider = MockOCRProvider()
    res = await provider.process_document(
        file_bytes=b"%PDF-1.4...",
        filename="prescription_patient123.pdf",
        mime_type="application/pdf"
    )
    assert res.document_type == "PRESCRIPTION"
    assert res.confidence_score >= 0.85
    assert res.review_status == "PROCESSED"
    assert "medications" in res.extracted_fields
    assert len(res.extracted_fields["medications"]) >= 2
    assert res.normalized_ocr is not None
    assert len(res.blocks) >= 3


@pytest.mark.asyncio
async def test_mock_ocr_empty_bytes_raises_error():
    provider = MockOCRProvider()
    with pytest.raises(ValueError, match="empty"):
        await provider.process_document(b"", "doc.pdf", "application/pdf")


@pytest.mark.asyncio
async def test_paddleocr_provider_missing_dependency_raises_explicit_error():
    provider = PaddleOCRProvider()
    provider._initialized = False
    # If paddleocr is not in test env, initializing raises explicit RuntimeError
    try:
        provider._init_engine()
        # If installed, verify initialized
        assert provider._initialized is True
    except RuntimeError as err:
        assert "PaddleOCR" in str(err)
        assert "PROVIDER_OCR=mock" in str(err)


def test_paddleocr_provider_normalizes_mocked_paddle_output():
    # Synthetic PaddleOCR output structure: [ [ [box], (text, score) ] ]
    synthetic_paddle_raw = [
        [
            [[[10, 10], [100, 10], [100, 30], [10, 30]], ("Patient: Rahul Sharma", 0.96)],
            [[[10, 40], [80, 40], [80, 60], [10, 60]], ("Date: 01/09/2026", 0.94)],
            [[[10, 70], [150, 70], [150, 90], [10, 90]], ("Rx: Paracetamol 500 mg", 0.92)],
            [[[10, 100], [140, 100], [140, 120], [10, 120]], ("1 tablet twice daily for 5 days", 0.89)],
            [[[10, 130], [120, 130], [120, 150], [10, 150]], ("Doctor: Dr. Amit Patil", 0.95)]
        ]
    ]

    blocks = PaddleOCRProvider._parse_paddle_output(synthetic_paddle_raw, page_number=1)
    assert len(blocks) == 5
    assert blocks[0].text == "Patient: Rahul Sharma"
    assert blocks[0].confidence == 0.96
    assert blocks[2].text == "Rx: Paracetamol 500 mg"
    assert blocks[4].text == "Doctor: Dr. Amit Patil"


def test_paddleocr_provider_malformed_ocr_blocks_safe_handling():
    malformed_output = [
        [
            None,
            [[[0, 0]], "Invalid format"],
            [[[10, 10], [100, 10]], ("Valid Text", 0.91)]
        ]
    ]
    blocks = PaddleOCRProvider._parse_paddle_output(malformed_output)
    assert len(blocks) == 1
    assert blocks[0].text == "Valid Text"


# --- Document Intelligence Extractor Unit Tests ---

def test_document_intelligence_prescription_extraction():
    raw_text = """
Patient: Rahul Sharma
Date: 01/09/2026

Rx:
Paracetamol 500 mg
1 tablet twice daily for 5 days

Doctor: Dr. Amit Patil
District Hospital OPD 02
"""
    blocks = [
        OCRBlock(text="Patient: Rahul Sharma", confidence=0.96),
        OCRBlock(text="Date: 01/09/2026", confidence=0.95),
        OCRBlock(text="Rx: Paracetamol 500 mg", confidence=0.92),
        OCRBlock(text="1 tablet twice daily for 5 days", confidence=0.88),
        OCRBlock(text="Doctor: Dr. Amit Patil", confidence=0.97)
    ]
    normalized = NormalizedOCRResult(
        raw_text=raw_text,
        blocks=blocks,
        average_confidence=0.93,
        pages_processed=1,
        provider_name="PaddleOCR"
    )

    result = DocumentIntelligenceExtractor.extract_from_normalized_ocr(normalized, "prescription.pdf")
    assert result.document_type == "PRESCRIPTION"
    assert result.confidence_score >= 0.85
    assert result.review_status == "PROCESSED"
    assert result.extracted_fields.get("patient_name") == "Rahul Sharma"
    assert result.extracted_fields.get("doctor_name") == "Dr. Amit Patil"
    assert result.extracted_fields.get("date") == "01/09/2026"
    assert len(result.extracted_fields.get("medications", [])) >= 1

    med = result.extracted_fields["medications"][0]
    assert "Paracetamol" in med["name"]
    assert "500 mg" in med["name"] or "500 mg" in med["dosage"]
    assert "BD" in med["frequency"] or "Twice daily" in med["frequency"]


def test_document_intelligence_lab_report_extraction():
    raw_text = """
City Pathology Laboratory
Patient: Priya Singh   Date: 2026-05-10
Specimen: Blood

Hemoglobin: 13.2 g/dL   (Reference: 12.0 - 16.5 g/dL)
ESR: 24 mm/hr          (Reference: 0.0 - 20.0 mm/hr)
Blood Sugar: 140 mg/dL (Reference: 70 - 100 mg/dL)
"""
    normalized = NormalizedOCRResult(
        raw_text=raw_text,
        blocks=[OCRBlock(text=raw_text, confidence=0.94)],
        average_confidence=0.94,
        pages_processed=1,
        provider_name="PaddleOCR"
    )

    result = DocumentIntelligenceExtractor.extract_from_normalized_ocr(normalized, "lab_report.pdf")
    assert result.document_type == "LAB_REPORT"
    assert result.confidence_score >= 0.85
    assert len(result.extracted_fields["lab_observations"]) >= 2

    obs_map = {o["test_name"]: o for o in result.extracted_fields["lab_observations"]}
    assert "Hemoglobin" in obs_map
    assert obs_map["Hemoglobin"]["flag"] == "NORMAL"

    assert "ESR" in obs_map
    assert obs_map["ESR"]["flag"] == "ELEVATED"


def test_document_intelligence_low_confidence_triggers_needs_review():
    raw_text = "Unclear faint handwriting with no clear medicine names"
    normalized = NormalizedOCRResult(
        raw_text=raw_text,
        blocks=[OCRBlock(text=raw_text, confidence=0.45)],
        average_confidence=0.45,
        pages_processed=1,
        provider_name="PaddleOCR"
    )
    result = DocumentIntelligenceExtractor.extract_from_normalized_ocr(normalized, "handwritten.jpg")
    assert result.review_status == "NEEDS_REVIEW"
    assert result.confidence_score < 0.80


def test_document_intelligence_empty_ocr_handling():
    normalized = NormalizedOCRResult(
        raw_text="",
        blocks=[],
        average_confidence=0.0,
        pages_processed=1,
        provider_name="PaddleOCR"
    )
    result = DocumentIntelligenceExtractor.extract_from_normalized_ocr(normalized, "blank.pdf")
    assert result.review_status == "FAILED"
    assert result.confidence_score == 0.0


def test_document_intelligence_does_not_invent_missing_values():
    raw_text = "Metformin 500mg OD"
    normalized = NormalizedOCRResult(
        raw_text=raw_text,
        blocks=[OCRBlock(text=raw_text, confidence=0.92)],
        average_confidence=0.92,
        pages_processed=1,
        provider_name="PaddleOCR"
    )
    result = DocumentIntelligenceExtractor.extract_from_normalized_ocr(normalized, "doc.pdf")
    # Missing patient name and doctor name must not be hallucinated
    assert result.extracted_fields.get("patient_name") is None
    assert result.extracted_fields.get("doctor_name") is None


# --- Document API Endpoints Integration Tests ---

def test_document_upload_and_process_api_workflow(client: TestClient, db):
    seed_database(db)

    # 1. Create Intake
    intake_res = client.post(
        "/api/v1/intakes",
        json={
            "patient_name": "Test Document Patient",
            "hospital_id": "hosp_district_01",
            "workflow_type": "GENERAL_CLINICAL",
            "interaction_mode": "TEXT",
            "consent_given": True
        }
    )
    intake_id = intake_res.json()["id"]

    # 2. Upload Prescription Document
    fake_pdf = io.BytesIO(b"%PDF-1.4 prescription file data")
    upload_res = client.post(
        "/api/v1/documents/upload",
        files={"file": ("prescription_patient.pdf", fake_pdf, "application/pdf")},
        data={"patient_id": "patient_001", "intake_session_id": intake_id, "document_type": "PRESCRIPTION"}
    )
    assert upload_res.status_code == 202
    doc_data = upload_res.json()
    doc_id = doc_data["document_id"]
    assert doc_data["status"] == "PENDING"

    # 3. Check Status Endpoint
    status_res = client.get(f"/api/v1/documents/{doc_id}/status")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "PENDING"

    # 4. Process Document OCR
    process_res = client.post(f"/api/v1/documents/{doc_id}/process")
    assert process_res.status_code == 200
    extracted_data = process_res.json()
    assert extracted_data["status"] == "NEEDS_REVIEW"
    assert len(extracted_data["extracted_facts"]) >= 1

    # 5. Retrieve Extracted Facts Endpoint
    facts_res = client.get(f"/api/v1/documents/{doc_id}/extractions")
    assert facts_res.status_code == 200
    facts_list = facts_res.json()
    assert len(facts_list) >= 1
    assert all(f["status"] == "NEEDS_REVIEW" for f in facts_list)


def test_document_upload_duplicate_detection(client: TestClient, db):
    seed_database(db)
    intake_res = client.post(
        "/api/v1/intakes",
        json={"patient_name": "Duplicate Test", "hospital_id": "hosp_district_01", "consent_given": True}
    )
    intake_id = intake_res.json()["id"]

    file_content = b"%PDF-1.4 identical document bytes"
    # First upload -> Success
    res1 = client.post(
        "/api/v1/documents/upload",
        files={"file": ("file1.pdf", io.BytesIO(file_content), "application/pdf")},
        data={"patient_id": "patient_001", "intake_session_id": intake_id}
    )
    assert res1.status_code == 202

    # Second upload with exact same bytes -> 409 Conflict
    res2 = client.post(
        "/api/v1/documents/upload",
        files={"file": ("file2.pdf", io.BytesIO(file_content), "application/pdf")},
        data={"patient_id": "patient_001", "intake_session_id": intake_id}
    )
    assert res2.status_code == 409


def test_document_process_nonexistent_fails_404(client: TestClient):
    res = client.post("/api/v1/documents/non_existent_doc_id_999/process")
    assert res.status_code == 404


def test_document_upload_empty_file_fails_400(client: TestClient):
    res = client.post(
        "/api/v1/documents/upload",
        files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
        data={"patient_id": "patient_001"}
    )
    assert res.status_code == 400


def test_document_provider_factory_resolution():
    registry = ProviderRegistry()
    ocr = registry.get_ocr()
    assert isinstance(ocr, (MockOCRProvider, PaddleOCRProvider))
