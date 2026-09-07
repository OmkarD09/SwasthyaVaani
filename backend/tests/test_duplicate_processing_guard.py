import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.document import DocumentModel
from app.models.user import Patient
from app.api.v1.documents import run_document_processing, _ACTIVE_DOCUMENT_PROCESSING
from app.services.providers.base import AbstractOCRProvider, OCRExtractionResult
from app.services.document_extraction import DocumentExtractorRateLimitError


@pytest.fixture
def mock_ocr():
    ocr = MagicMock(spec=AbstractOCRProvider)
    ocr.process_document = AsyncMock(
        return_value=OCRExtractionResult(
            document_type="PRESCRIPTION",
            extracted_fields={},
            confidence_score=0.99,
            pages_processed=1,
            provider_name="MockOCR",
            provider_version="1.0",
            raw_text="Paracetamol 650 mg",
            text_blocks=[
                {
                    "text": "Paracetamol 650 mg",
                    "page": 1,
                    "bounding_box": [0, 0, 10, 10],
                    "confidence": 0.99,
                }
            ],
        )
    )
    return ocr


@pytest.fixture
def test_doc(db):
    patient = Patient(id="guard-patient", display_name="Guard Patient")
    doc = DocumentModel(
        id="test-guard-doc-001",
        patient_id=patient.id,
        file_name="guard_rx.png",
        storage_object_id="prescription/2026/guard_rx.png",
        mime_type="image/png",
        file_size=200,
        sha256="d" * 64,
        page_count=1,
        document_type="PRESCRIPTION",
        status="PENDING",
    )
    db.add_all([patient, doc])
    db.commit()
    return doc


def test_duplicate_processing_guard_skips_when_in_flight(db, test_doc, mock_ocr):
    # Simulate in-flight active processing
    _ACTIVE_DOCUMENT_PROCESSING.add(test_doc.id)

    try:
        with patch("app.api.v1.documents.load_private_file", return_value=b"fake-bytes"):
            res = asyncio.run(run_document_processing(test_doc.id, db, ocr=mock_ocr))

        # Must not have called OCR because it's already active
        assert not mock_ocr.process_document.called
        assert res.document_id == test_doc.id
    finally:
        _ACTIVE_DOCUMENT_PROCESSING.discard(test_doc.id)


def test_completed_document_is_not_reprocessed_by_default(db, test_doc, mock_ocr):
    test_doc.status = "NEEDS_REVIEW"
    db.commit()

    with patch("app.api.v1.documents.load_private_file", return_value=b"fake-bytes"):
        res = asyncio.run(run_document_processing(test_doc.id, db, ocr=mock_ocr))

    # Should return existing state without running OCR
    assert not mock_ocr.process_document.called
    assert res.status == "NEEDS_REVIEW"


def test_failed_document_allows_retry(db, test_doc, mock_ocr):
    test_doc.status = "PROCESSING_FAILED"
    test_doc.failure_code = "EXTRACTION_RATE_LIMITED"
    db.commit()

    with patch("app.api.v1.documents.load_private_file", return_value=b"fake-bytes"), \
         patch("app.api.v1.documents.extract_and_persist_candidates", AsyncMock()):
        res = asyncio.run(run_document_processing(test_doc.id, db, ocr=mock_ocr, force_reprocess=True))

    assert mock_ocr.process_document.called
    assert res.status == "NEEDS_REVIEW"
    reloaded = db.query(DocumentModel).filter(DocumentModel.id == test_doc.id).first()
    assert reloaded.status == "NEEDS_REVIEW"
    assert reloaded.failure_code is None


def test_rate_limit_error_unwrapped_and_classified(db, test_doc, mock_ocr):
    test_doc.status = "PENDING"
    db.commit()

    with patch("app.api.v1.documents.load_private_file", return_value=b"fake-bytes"), \
         patch("app.api.v1.documents.extract_and_persist_candidates", AsyncMock(side_effect=DocumentExtractorRateLimitError("429 TPM limit"))):
        with pytest.raises(DocumentExtractorRateLimitError):
            asyncio.run(run_document_processing(test_doc.id, db, ocr=mock_ocr))

    reloaded = db.query(DocumentModel).filter(DocumentModel.id == test_doc.id).first()
    assert reloaded.status == "PROCESSING_FAILED"
    assert reloaded.failure_code == "EXTRACTION_RATE_LIMITED"
