from datetime import datetime, timezone
import pytest

from app.schemas.document import (
    DocumentCandidateExtractionResult,
    DocumentEvidenceReference,
    DocumentExtractionInput,
    MedicationCandidate,
    PersistedOCREvidenceBlock,
)
from app.services.document_extraction import (
    DocumentCandidateValidationError,
    validate_candidate_evidence,
)


@pytest.fixture
def extraction_context():
    blocks = [
        PersistedOCREvidenceBlock(
            evidence_id="evi-001",
            ocr_run_id="run-1",
            document_id="doc-1",
            block_index=1,
            text="Tab Augmentin 625mg",
            ocr_confidence=0.98,
            page_number=1,
            bounding_box=None,
            provider_name="PaddleOCR",
            provider_version="3.7.0",
            processed_at=datetime.now(timezone.utc),
        ),
        PersistedOCREvidenceBlock(
            evidence_id="evi-002",
            ocr_run_id="run-1",
            document_id="doc-1",
            block_index=2,
            text="1 tab twice daily for 5 days",
            ocr_confidence=0.96,
            page_number=1,
            bounding_box=None,
            provider_name="PaddleOCR",
            provider_version="3.7.0",
            processed_at=datetime.now(timezone.utc),
        ),
        PersistedOCREvidenceBlock(
            evidence_id="evi-003",
            ocr_run_id="run-1",
            document_id="doc-1",
            block_index=3,
            text="Blood Pressure: 120/80 mmHg",
            ocr_confidence=0.97,
            page_number=1,
            bounding_box=None,
            provider_name="PaddleOCR",
            provider_version="3.7.0",
            processed_at=datetime.now(timezone.utc),
        ),
    ]
    inp = DocumentExtractionInput(
        document_id="doc-1",
        ocr_run_id="run-1",
        file_name="rx.pdf",
        document_type_hint="PRESCRIPTION",
        evidence_blocks=blocks,
        raw_ocr_text="\n".join(b.text for b in blocks),
    )
    return inp


def test_single_block_evidence_validation_success(extraction_context):
    """Single block with matching text succeeds validation."""
    med = MedicationCandidate(
        name="Augmentin 625mg",
        source_evidence=[DocumentEvidenceReference(evidence_id="evi-001")],
        extraction_confidence=0.95,
    )
    result = DocumentCandidateExtractionResult(medications=[med])
    validate_candidate_evidence(extraction_context, result)


def test_multi_line_adjacent_blocks_validation_success(extraction_context):
    """Candidate combining text from multiple adjacent blocks succeeds validation."""
    med = MedicationCandidate(
        name="Augmentin 625mg",
        frequency="twice daily",
        duration="5 days",
        source_evidence=[
            DocumentEvidenceReference(evidence_id="evi-001"),
            DocumentEvidenceReference(evidence_id="evi-002"),
        ],
        extraction_confidence=0.95,
    )
    result = DocumentCandidateExtractionResult(medications=[med])
    validate_candidate_evidence(extraction_context, result)


def test_multi_line_adjacent_blocks_reverse_citation_order(extraction_context):
    """Candidate citing adjacent blocks in reverse order is sorted by block_index and passes."""
    med = MedicationCandidate(
        name="Augmentin 625mg",
        frequency="twice daily",
        duration="5 days",
        source_evidence=[
            DocumentEvidenceReference(evidence_id="evi-002"),
            DocumentEvidenceReference(evidence_id="evi-001"),
        ],  # Cited in reverse order
        extraction_confidence=0.95,
    )
    result = DocumentCandidateExtractionResult(medications=[med])
    validate_candidate_evidence(extraction_context, result)


def test_unsupported_text_fails_validation(extraction_context):
    """Candidate containing text not present in the cited evidence blocks must raise DocumentCandidateValidationError."""
    med = MedicationCandidate(
        name="Augmentin 625mg",
        frequency="three times daily",  # Not in evidence!
        source_evidence=[
            DocumentEvidenceReference(evidence_id="evi-001"),
            DocumentEvidenceReference(evidence_id="evi-002"),
        ],
        extraction_confidence=0.95,
    )
    result = DocumentCandidateExtractionResult(medications=[med])
    with pytest.raises(DocumentCandidateValidationError) as excinfo:
        validate_candidate_evidence(extraction_context, result)
    assert "unsupported by its cited OCR evidence" in str(excinfo.value)


def test_unrelated_block_citation_fails_validation(extraction_context):
    """Candidate citing a completely irrelevant block (BP block for medication) fails."""
    med = MedicationCandidate(
        name="Augmentin 625mg",
        source_evidence=[DocumentEvidenceReference(evidence_id="evi-003")],
        extraction_confidence=0.95,
    )
    result = DocumentCandidateExtractionResult(medications=[med])
    with pytest.raises(DocumentCandidateValidationError) as excinfo:
        validate_candidate_evidence(extraction_context, result)
    assert "unsupported by its cited OCR evidence" in str(excinfo.value)


def test_unknown_evidence_id_fails_validation(extraction_context):
    """Candidate citing a nonexistent evidence_id raises error."""
    med = MedicationCandidate(
        name="Augmentin 625mg",
        source_evidence=[DocumentEvidenceReference(evidence_id="evi-999")],
        extraction_confidence=0.95,
    )
    result = DocumentCandidateExtractionResult(medications=[med])
    with pytest.raises(DocumentCandidateValidationError) as excinfo:
        validate_candidate_evidence(extraction_context, result)
    assert "outside the supplied OCR run" in str(excinfo.value)
