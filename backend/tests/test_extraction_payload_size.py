import json
import pytest

from app.schemas.document import DocumentExtractionInput, PersistedOCREvidenceBlock
from app.services.document_extraction import (
    build_document_extraction_input,
    serialize_extraction_input_for_llm,
)
from app.models.user import Patient
from app.models.document import DocumentModel
from app.services.providers.base import OCRExtractionResult
from app.services.document_intelligence import replace_ocr_evidence


def test_build_document_extraction_input_strips_bounding_box(db):
    """Verify that build_document_extraction_input excludes coordinate arrays from the LLM payload."""
    patient = Patient(id="pt-payload-test", display_name="Test Payload Patient")
    doc = DocumentModel(
        patient_id=patient.id,
        file_name="rx_sample.pdf",
        storage_object_id="prescription/2026/rx_sample.pdf",
        mime_type="application/pdf",
        file_size=1024,
        sha256="c" * 64,
        page_count=1,
        document_type="PRESCRIPTION",
        status="NEEDS_REVIEW",
    )
    db.add_all([patient, doc])
    db.commit()

    # Create OCR result with polygon coordinates
    ocr_result = OCRExtractionResult(
        document_type="PRESCRIPTION",
        extracted_fields={},
        confidence_score=0.95,
        pages_processed=1,
        provider_name="PaddleOCR",
        provider_version="3.7.0",
        raw_text="Tab Paracetamol 500mg\nTake 1 tab twice daily",
        text_blocks=[
            {
                "text": "Tab Paracetamol 500mg",
                "confidence": 0.98,
                "box": [[100, 200], [400, 200], [400, 250], [100, 250]],
                "page": 1,
            },
            {
                "text": "Take 1 tab twice daily",
                "confidence": 0.92,
                "box": [[100, 260], [450, 260], [450, 310], [100, 310]],
                "page": 1,
            },
        ],
    )
    run = replace_ocr_evidence(db, doc, ocr_result)
    db.commit()

    extraction_input = build_document_extraction_input(db, doc, run)

    # All evidence blocks in extraction_input must have bounding_box set to None
    assert len(extraction_input.evidence_blocks) == 2
    for block in extraction_input.evidence_blocks:
        assert block.bounding_box is None, "Bounding box coordinates must be stripped from LLM extraction input"


def test_serialize_extraction_input_for_llm_compactness():
    """Verify serialize_extraction_input_for_llm produces minimal JSON payload without extraneous fields."""
    from datetime import datetime, timezone
    blocks = [
        PersistedOCREvidenceBlock(
            evidence_id=f"evi-{i:03d}",
            ocr_run_id="run-1",
            document_id="doc-1",
            block_index=i,
            text=f"Clinical Line Observation Number {i} with dosage 50mg daily",
            ocr_confidence=0.95,
            page_number=1,
            bounding_box=None,
            provider_name="PaddleOCR",
            provider_version="3.7.0",
            processed_at=datetime.now(timezone.utc),
        )
        for i in range(45)
    ]
    inp = DocumentExtractionInput(
        document_id="doc-1",
        ocr_run_id="run-1",
        file_name="prescription_heavy.pdf",
        document_type_hint="PRESCRIPTION",
        evidence_blocks=blocks,
        raw_ocr_text="\n".join(b.text for b in blocks),
    )

    serialized = serialize_extraction_input_for_llm(inp)
    parsed = json.loads(serialized)

    assert "evidence_blocks" in parsed
    assert len(parsed["evidence_blocks"]) == 45

    for b in parsed["evidence_blocks"]:
        # Should only have evidence_id, page, text
        assert set(b.keys()) == {"evidence_id", "page", "text"}
        assert "box" not in b
        assert "bounding_box" not in b
        assert "confidence" not in b

    # Ensure character size is dramatically below the limit
    # 45 blocks should be well under 6,000 characters (~1,500 tokens), safe for Groq 8000 TPM
    assert len(serialized) < 8000
