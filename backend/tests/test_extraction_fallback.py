import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.models.document import DocumentModel
from app.models.user import Patient
from app.schemas.document import DocumentCandidateExtractionResult
from app.services.document_extraction import (
    DocumentCandidateValidationError,
    DocumentExtractorProviderError,
    DocumentExtractorRateLimitError,
    FallbackDocumentExtractor,
    GroqDocumentExtractor,
    GeminiDocumentExtractor,
    get_document_extractor,
    validate_candidate_evidence,
)
from app.services.providers.base import OCRExtractionResult
from app.services.document_intelligence import replace_ocr_evidence
from app.services.document_extraction import build_document_extraction_input


@pytest.fixture
def extraction_context(db):
    patient = Patient(id="fb-patient", display_name="Fallback Patient")
    doc = DocumentModel(
        patient_id=patient.id,
        file_name="prescription.png",
        storage_object_id="prescription/2026/prescription.png",
        mime_type="image/png",
        file_size=500,
        sha256="c" * 64,
        page_count=1,
        document_type="PRESCRIPTION",
        status="PENDING",
    )
    db.add_all([patient, doc])
    db.commit()

    ocr = OCRExtractionResult(
        document_type="PRESCRIPTION",
        extracted_fields={},
        confidence_score=0.95,
        pages_processed=1,
        provider_name="PaddleOCR",
        provider_version="3.7.0",
        raw_text="Amoxicillin 500 mg\nTake one tablet twice daily",
        text_blocks=[
            {
                "text": "Amoxicillin 500 mg",
                "page": 1,
                "bounding_box": [10.0, 10.0, 100.0, 30.0],
                "confidence": 0.98,
            },
            {
                "text": "Take one tablet twice daily",
                "page": 1,
                "bounding_box": [10.0, 35.0, 200.0, 55.0],
                "confidence": 0.95,
            },
        ],
    )
    run = replace_ocr_evidence(db, doc, ocr)
    db.commit()
    extraction_input = build_document_extraction_input(db, doc, run)
    return doc, run, extraction_input


def test_groq_429_triggers_gemini_fallback(extraction_context):
    _, _, extraction_input = extraction_context
    evidence_id = extraction_input.evidence_blocks[0].evidence_id

    # Primary Groq extractor that fails with rate limit
    mock_groq = MagicMock(spec=GroqDocumentExtractor)
    mock_groq.provider_name = "Groq"
    mock_groq.model_name = "openai/gpt-oss-120b"
    mock_groq.extract_candidates = AsyncMock(
        side_effect=DocumentExtractorRateLimitError("Rate limit reached: limit 8000 TPM")
    )

    # Fallback Gemini extractor that succeeds
    gemini_result = DocumentCandidateExtractionResult(
        medications=[
            {
                "name": "Amoxicillin",
                "strength_or_dose": "500 mg",
                "frequency": None,
                "duration": None,
                "source_evidence": [{"evidence_id": evidence_id}],
                "extraction_confidence": 0.95,
                "status": "NEEDS_REVIEW",
            }
        ],
        labs=[],
        history=[],
    )
    mock_gemini = MagicMock(spec=GeminiDocumentExtractor)
    mock_gemini.provider_name = "Gemini"
    mock_gemini.model_name = "gemini-3.5-flash-lite"
    mock_gemini.extract_candidates = AsyncMock(return_value=gemini_result)

    fallback_extractor = FallbackDocumentExtractor(primary=mock_groq, fallback=mock_gemini)

    result = asyncio.run(fallback_extractor.extract_candidates(extraction_input))

    assert mock_groq.extract_candidates.called
    assert mock_gemini.extract_candidates.called
    assert len(result.medications) == 1
    assert result.medications[0].name == "Amoxicillin"
    assert fallback_extractor.provider_name == "Gemini"


def test_groq_non_429_error_does_not_trigger_gemini_fallback(extraction_context):
    _, _, extraction_input = extraction_context

    mock_groq = MagicMock(spec=GroqDocumentExtractor)
    mock_groq.provider_name = "Groq"
    mock_groq.model_name = "openai/gpt-oss-120b"
    mock_groq.extract_candidates = AsyncMock(
        side_effect=DocumentExtractorProviderError("Internal 500 server error")
    )

    mock_gemini = MagicMock(spec=GeminiDocumentExtractor)
    mock_gemini.provider_name = "Gemini"
    mock_gemini.model_name = "gemini-3.5-flash-lite"
    mock_gemini.extract_candidates = AsyncMock()

    fallback_extractor = FallbackDocumentExtractor(primary=mock_groq, fallback=mock_gemini)

    with pytest.raises(DocumentExtractorProviderError, match="Internal 500 server error"):
        asyncio.run(fallback_extractor.extract_candidates(extraction_input))

    assert mock_groq.extract_candidates.called
    assert not mock_gemini.extract_candidates.called


def test_fallback_extractor_strictly_enforces_evidence_grounding(extraction_context):
    _, _, extraction_input = extraction_context
    evidence_id = extraction_input.evidence_blocks[0].evidence_id

    # Hallucinated medication not supported in OCR blocks
    unsupported_result = DocumentCandidateExtractionResult(
        medications=[
            {
                "name": "Ibuprofen",
                "strength_or_dose": "400 mg",
                "frequency": None,
                "duration": None,
                "source_evidence": [{"evidence_id": evidence_id}],
                "extraction_confidence": 0.9,
                "status": "NEEDS_REVIEW",
            }
        ],
        labs=[],
        history=[],
    )

    with pytest.raises(DocumentCandidateValidationError, match="unsupported"):
        validate_candidate_evidence(extraction_input, unsupported_result)


def test_get_document_extractor_creates_fallback_when_keys_present():
    extractor = get_document_extractor(
        "groq",
        groq_api_key="mock-groq-key",
        groq_model="openai/gpt-oss-120b",
        gemini_api_key="mock-gemini-key",
        gemini_model="gemini-3.5-flash-lite",
    )
    assert isinstance(extractor, FallbackDocumentExtractor)
    assert extractor.primary.provider_name == "Groq"
    assert extractor.fallback.provider_name == "GoogleGemini"
