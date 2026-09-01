import asyncio

import pytest

from app.models.document import (
    DocumentCandidateEvidenceLinkModel,
    DocumentCandidateModel,
    DocumentCandidateSetModel,
    DocumentModel,
    DocumentOCREvidenceModel,
    DocumentOCRRunModel,
)
from app.models.intake import ClinicalStateModel
from app.models.user import Patient
from app.schemas.document import DocumentCandidateExtractionResult
from app.services.document_extraction import (
    DocumentCandidateValidationError,
    DocumentExtractorConfigurationError,
    DocumentExtractorProviderError,
    GeminiDocumentExtractor,
    GroqDocumentExtractor,
    _groq_strict_json_schema,
    build_document_extraction_input,
    extract_and_persist_candidates,
    get_document_extractor,
    persist_candidate_result,
)
from app.services.document_intelligence import replace_ocr_evidence
from app.services.providers.base import OCRExtractionResult


@pytest.fixture
def evidence_context(db):
    patient = Patient(id="candidate-patient", display_name="Synthetic Candidate")
    document = DocumentModel(
        patient_id=patient.id,
        file_name="synthetic.png",
        storage_object_id="prescription/2026/synthetic.png",
        mime_type="image/png",
        file_size=100,
        sha256="b" * 64,
        page_count=1,
        document_type="PRESCRIPTION",
        status="NEEDS_REVIEW",
    )
    db.add_all([patient, document])
    db.commit()
    ocr = OCRExtractionResult(
        document_type="UNCLASSIFIED",
        extracted_fields={},
        confidence_score=0.91,
        pages_processed=1,
        provider_name="PaddleOCR",
        provider_version="3.7.0",
        raw_text="Paracetamol 650 mg\nHemoglobin 13.2 g/dL\nMetformin 500 mg",
        text_blocks=[
            {
                "text": "Paracetamol 650 mg",
                "confidence": 0.93,
                "page": 1,
                "bounding_box": [1.0, 2.0, 3.0, 4.0],
            },
            {
                "text": "Hemoglobin 13.2 g/dL",
                "confidence": 0.89,
                "page": 1,
                "bounding_box": [5.0, 6.0, 7.0, 8.0],
            },
            {
                "text": "Metformin 500 mg",
                "confidence": 0.91,
                "page": 1,
                "bounding_box": [9.0, 10.0, 11.0, 12.0],
            },
        ],
    )
    run = replace_ocr_evidence(db, document, ocr)
    db.commit()
    return document, run, build_document_extraction_input(db, document, run)


def valid_payload(extraction_input):
    medication_id = extraction_input.evidence_blocks[0].evidence_id
    lab_id = extraction_input.evidence_blocks[1].evidence_id
    return {
        "medications": [
            {
                "name": "Paracetamol",
                "strength_or_dose": "650 mg",
                "frequency": None,
                "duration": None,
                "source_evidence": [{"evidence_id": medication_id}],
                "extraction_confidence": 0.87,
                "status": "NEEDS_REVIEW",
            }
        ],
        "labs": [
            {
                "test_name": "Hemoglobin",
                "value": "13.2",
                "unit": "g/dL",
                "reference_range": None,
                "date": None,
                "source_evidence": [{"evidence_id": lab_id}],
                "extraction_confidence": 0.82,
                "status": "NEEDS_REVIEW",
            }
        ],
        "history": [],
    }


def test_gemini_document_extractor_validates_and_persists_candidates(
    db, evidence_context
):
    document, run, extraction_input = evidence_context
    observed = {}

    async def transport(system_instruction, contents, response_schema):
        observed["system_instruction"] = system_instruction
        observed["contents"] = contents
        observed["schema"] = response_schema
        return valid_payload(extraction_input)

    extractor = GeminiDocumentExtractor(
        api_key="test-transport-only",
        model_name="gemini-test",
        transport=transport,
    )
    candidate_set = asyncio.run(
        extract_and_persist_candidates(db, extractor, extraction_input)
    )
    db.commit()

    assert observed["schema"] is DocumentCandidateExtractionResult
    assert "ClinicalState" not in observed["contents"]
    assert "never diagnose" in observed["system_instruction"].casefold()
    assert candidate_set.document_id == document.id
    assert candidate_set.ocr_run_id == run.id
    candidates = db.query(DocumentCandidateModel).all()
    assert len(candidates) == 2
    medication = next(item for item in candidates if item.candidate_type == "MEDICATION")
    lab = next(item for item in candidates if item.candidate_type == "LAB")
    assert medication.value_json["frequency"] is None
    assert medication.value_json["duration"] is None
    assert lab.value_json["reference_range"] is None
    assert medication.status == lab.status == "NEEDS_REVIEW"
    assert medication.extraction_confidence == pytest.approx(0.87)
    assert db.query(DocumentCandidateEvidenceLinkModel).count() == 2
    assert db.query(ClinicalStateModel).count() == 0


def test_missing_gemini_key_creates_no_candidates(db, evidence_context):
    with pytest.raises(DocumentExtractorConfigurationError, match="GEMINI_API_KEY"):
        GeminiDocumentExtractor(api_key=None, model_name="gemini-test")
    assert db.query(DocumentCandidateModel).count() == 0
    assert db.query(DocumentOCREvidenceModel).count() == 3


def test_document_extractor_selection_is_explicit():
    groq = get_document_extractor(
        "groq",
        groq_api_key="transport-test",
        groq_model="openai/gpt-oss-20b",
        gemini_api_key="transport-test",
        gemini_model="gemini-test",
    )
    gemini = get_document_extractor(
        "gemini",
        groq_api_key="transport-test",
        groq_model="openai/gpt-oss-20b",
        gemini_api_key="transport-test",
        gemini_model="gemini-test",
    )
    assert isinstance(groq, GroqDocumentExtractor)
    assert isinstance(gemini, GeminiDocumentExtractor)
    with pytest.raises(DocumentExtractorConfigurationError, match="Unsupported"):
        get_document_extractor(
            "invalid",
            groq_api_key=None,
            groq_model="openai/gpt-oss-20b",
            gemini_api_key=None,
            gemini_model="gemini-test",
        )


def test_missing_groq_key_fails_without_fallback():
    with pytest.raises(DocumentExtractorConfigurationError, match="GROQ_API_KEY"):
        GroqDocumentExtractor(None, "openai/gpt-oss-20b")


def test_groq_strict_schema_requires_and_closes_every_object():
    schema = _groq_strict_json_schema(
        DocumentCandidateExtractionResult.model_json_schema()
    )
    objects = [schema, *schema["$defs"].values()]
    for item in objects:
        assert item["additionalProperties"] is False
        assert set(item["required"]) == set(item["properties"])


def test_groq_transport_boundary_uses_existing_validation(evidence_context):
    _, _, extraction_input = evidence_context

    async def transport(*_):
        return valid_payload(extraction_input)

    result = asyncio.run(
        GroqDocumentExtractor(
            "transport-test", "openai/gpt-oss-20b", transport
        ).extract_candidates(extraction_input)
    )
    assert result.medications[0].frequency is None
    assert result.labs[0].reference_range is None
    assert all(
        item.status == "NEEDS_REVIEW"
        for item in [*result.medications, *result.labs, *result.history]
    )


def test_groq_candidates_persist_with_provider_provenance_and_idempotency(
    db, evidence_context
):
    _, _, extraction_input = evidence_context

    async def transport(*_):
        return valid_payload(extraction_input)

    extractor = GroqDocumentExtractor(
        "transport-test", "openai/gpt-oss-20b", transport
    )
    asyncio.run(extract_and_persist_candidates(db, extractor, extraction_input))
    db.commit()
    asyncio.run(extract_and_persist_candidates(db, extractor, extraction_input))
    db.commit()

    candidate_set = db.query(DocumentCandidateSetModel).one()
    assert candidate_set.provider_name == "Groq"
    assert candidate_set.model_name == "openai/gpt-oss-20b"
    assert db.query(DocumentCandidateModel).count() == 2
    assert db.query(DocumentCandidateEvidenceLinkModel).count() == 2
    assert db.query(ClinicalStateModel).count() == 0


def test_groq_failure_preserves_ocr_and_persists_no_partial_candidates(
    db, evidence_context
):
    _, _, extraction_input = evidence_context

    async def failing(*_):
        raise TimeoutError("synthetic timeout")

    extractor = GroqDocumentExtractor(
        "transport-test", "openai/gpt-oss-20b", failing
    )
    with pytest.raises(DocumentExtractorProviderError, match="transport"):
        asyncio.run(extract_and_persist_candidates(db, extractor, extraction_input))

    assert db.query(DocumentCandidateSetModel).count() == 0
    assert db.query(DocumentCandidateModel).count() == 0
    assert db.query(DocumentOCREvidenceModel).count() == 3
    assert db.query(DocumentOCRRunModel).count() == 1
    assert db.query(ClinicalStateModel).count() == 0


def test_unknown_evidence_id_rejects_entire_result(db, evidence_context):
    _, _, extraction_input = evidence_context
    payload = valid_payload(extraction_input)
    payload["medications"][0]["source_evidence"] = [{"evidence_id": "unknown"}]

    async def transport(*_):
        return payload

    extractor = GeminiDocumentExtractor("test", "gemini-test", transport)
    with pytest.raises(DocumentCandidateValidationError, match="outside"):
        asyncio.run(extract_and_persist_candidates(db, extractor, extraction_input))
    assert db.query(DocumentCandidateModel).count() == 0
    assert db.query(DocumentOCREvidenceModel).count() == 3


def test_malformed_output_and_provider_failure_preserve_ocr_evidence(
    db, evidence_context
):
    _, _, extraction_input = evidence_context

    async def malformed(*_):
        return {"medications": [{"status": "CONFIRMED"}]}

    malformed_extractor = GeminiDocumentExtractor("test", "gemini-test", malformed)
    with pytest.raises(DocumentCandidateValidationError, match="invalid"):
        asyncio.run(
            extract_and_persist_candidates(db, malformed_extractor, extraction_input)
        )

    async def failing(*_):
        raise TimeoutError("synthetic timeout")

    failing_extractor = GeminiDocumentExtractor("test", "gemini-test", failing)
    with pytest.raises(DocumentExtractorProviderError, match="transport"):
        asyncio.run(
            extract_and_persist_candidates(db, failing_extractor, extraction_input)
        )
    assert db.query(DocumentCandidateModel).count() == 0
    assert db.query(DocumentOCREvidenceModel).count() == 3
    assert db.query(DocumentOCRRunModel).count() == 1
    assert db.query(ClinicalStateModel).count() == 0


def test_candidate_persistence_replaces_same_run_provider_model(db, evidence_context):
    _, _, extraction_input = evidence_context

    async def transport(*_):
        return valid_payload(extraction_input)

    extractor = GeminiDocumentExtractor("test", "gemini-test", transport)
    asyncio.run(extract_and_persist_candidates(db, extractor, extraction_input))
    db.commit()
    first_set_id = db.query(DocumentCandidateSetModel.id).scalar()
    asyncio.run(extract_and_persist_candidates(db, extractor, extraction_input))
    db.commit()

    assert db.query(DocumentCandidateSetModel).count() == 1
    assert db.query(DocumentCandidateSetModel.id).scalar() != first_set_id
    assert db.query(DocumentCandidateModel).count() == 2
    assert db.query(DocumentCandidateEvidenceLinkModel).count() == 2


def test_new_ocr_run_invalidates_candidates_linked_to_replaced_evidence(
    db, evidence_context
):
    document, _, extraction_input = evidence_context
    result = DocumentCandidateExtractionResult.model_validate(
        valid_payload(extraction_input)
    )
    persist_candidate_result(
        db, extraction_input, result, "GoogleGemini", "gemini-test"
    )
    db.commit()
    replacement = OCRExtractionResult(
        document_type="UNCLASSIFIED",
        extracted_fields={},
        confidence_score=0.75,
        pages_processed=1,
        provider_name="PaddleOCR",
        provider_version="3.7.0",
        raw_text="replacement evidence",
        text_blocks=[
            {
                "text": "replacement evidence",
                "confidence": 0.75,
                "page": 1,
                "bounding_box": [1.0, 1.0, 2.0, 2.0],
            }
        ],
    )

    replace_ocr_evidence(db, document, replacement)
    db.commit()

    assert db.query(DocumentCandidateSetModel).count() == 0
    assert db.query(DocumentCandidateModel).count() == 0
    assert db.query(DocumentCandidateEvidenceLinkModel).count() == 0
    assert db.query(DocumentOCREvidenceModel).count() == 1


def test_failed_replacement_is_transactional_and_keeps_previous_set(
    db, evidence_context
):
    _, _, extraction_input = evidence_context
    result = DocumentCandidateExtractionResult.model_validate(
        valid_payload(extraction_input)
    )
    original = persist_candidate_result(
        db, extraction_input, result, "GoogleGemini", "gemini-test"
    )
    db.commit()
    original_id = original.id
    invalid = result.model_copy(deep=True)
    invalid.medications[0].name = "Invented medicine"

    with (
        pytest.raises(DocumentCandidateValidationError, match="unsupported"),
        db.begin_nested(),
    ):
        persist_candidate_result(
            db, extraction_input, invalid, "GoogleGemini", "gemini-test"
        )

    assert db.query(DocumentCandidateSetModel).one().id == original_id
    assert db.query(DocumentCandidateModel).count() == 2
    assert db.query(DocumentOCREvidenceModel).count() == 3


def test_metformin_does_not_create_inferred_diagnosis(db, evidence_context):
    _, _, extraction_input = evidence_context
    metformin_id = extraction_input.evidence_blocks[2].evidence_id
    payload = {
        "medications": [
            {
                "name": "Metformin",
                "strength_or_dose": "500 mg",
                "frequency": None,
                "duration": None,
                "source_evidence": [{"evidence_id": metformin_id}],
                "extraction_confidence": 0.8,
                "status": "NEEDS_REVIEW",
            }
        ],
        "labs": [],
        "history": [],
    }

    async def transport(*_):
        return payload

    result = asyncio.run(
        GeminiDocumentExtractor("test", "gemini-test", transport).extract_candidates(
            extraction_input
        )
    )
    assert result.history == []
