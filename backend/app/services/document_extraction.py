import re
from collections.abc import Awaitable, Callable, Iterable
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models.document import (
    DocumentCandidateEvidenceLinkModel,
    DocumentCandidateModel,
    DocumentCandidateSetModel,
    DocumentModel,
    DocumentOCREvidenceModel,
    DocumentOCRRunModel,
)
from app.schemas.document import (
    DocumentCandidateExtractionResult,
    DocumentExtractionInput,
    PersistedOCREvidenceBlock,
)
from app.services.document_intelligence import AbstractDocumentExtractor

GeminiTransport = Callable[
    [str, str, type[DocumentCandidateExtractionResult]], Awaitable[Any]
]


def _groq_strict_json_schema(value: Any) -> Any:
    """Adapt Pydantic JSON Schema to Groq strict structured-output rules."""
    if isinstance(value, list):
        return [_groq_strict_json_schema(item) for item in value]
    if not isinstance(value, dict):
        return value
    schema = {
        key: _groq_strict_json_schema(item) for key, item in value.items()
    }
    if schema.get("type") == "object" and "properties" in schema:
        schema["required"] = list(schema["properties"])
        schema["additionalProperties"] = False
    return schema


class DocumentExtractorError(RuntimeError):
    """Base error for document semantic extraction."""


class DocumentExtractorConfigurationError(DocumentExtractorError):
    """Raised when explicitly selected Gemini extraction cannot be configured."""


class DocumentExtractorProviderError(DocumentExtractorError):
    """Raised when Gemini transport fails or returns no structured result."""


class DocumentCandidateValidationError(DocumentExtractorError):
    """Raised when candidate output is invalid or unsupported by its evidence."""


SYSTEM_INSTRUCTION = """You extract untrusted candidates from OCR evidence only.
Extract only facts explicitly stated in the supplied blocks. Never diagnose, prescribe,
infer diseases, calculate lab interpretations, or add unsupported medical details.
Preserve missing information as null. Every candidate must cite one or more supplied
evidence IDs. Return schema-valid structured output only. Every result is a candidate
requiring physician review; never mark anything confirmed or processed. Do not provide
reasoning or chain-of-thought."""


def _normalized(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", value.casefold()))


def _candidate_values(candidate: Any) -> Iterable[str]:
    excluded = {"source_evidence", "extraction_confidence", "status", "fact_type"}
    for field_name, value in candidate.model_dump().items():
        if field_name not in excluded and isinstance(value, str) and value.strip():
            yield value


def validate_candidate_evidence(
    extraction_input: DocumentExtractionInput,
    result: DocumentCandidateExtractionResult,
) -> None:
    evidence = {block.evidence_id: block for block in extraction_input.evidence_blocks}
    candidates = [*result.medications, *result.labs, *result.history]
    for candidate in candidates:
        reference_ids = [reference.evidence_id for reference in candidate.source_evidence]
        if any(reference_id not in evidence for reference_id in reference_ids):
            raise DocumentCandidateValidationError(
                "Candidate referenced evidence outside the supplied OCR run"
            )
        supporting_text = _normalized(
            " ".join(evidence[reference_id].text for reference_id in reference_ids)
        )
        for value in _candidate_values(candidate):
            if _normalized(value) not in supporting_text:
                raise DocumentCandidateValidationError(
                    "Candidate contained a value unsupported by its cited OCR evidence"
                )


class GeminiDocumentExtractor(AbstractDocumentExtractor):
    """Document-only Gemini structured extractor with no mock fallback."""

    provider_name = "GoogleGemini"

    def __init__(
        self,
        api_key: str | None,
        model_name: str,
        transport: GeminiTransport | None = None,
    ):
        if not api_key:
            raise DocumentExtractorConfigurationError(
                "Gemini document extraction requires GEMINI_API_KEY"
            )
        self.model_name = model_name
        self._api_key = api_key
        self._transport = transport or self._google_transport

    async def _google_transport(
        self,
        system_instruction: str,
        contents: str,
        response_schema: type[DocumentCandidateExtractionResult],
    ) -> Any:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self._api_key)
            response = await client.aio.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=response_schema,
                    temperature=0,
                ),
            )
        except Exception as exc:
            raise DocumentExtractorProviderError(
                "Gemini document extraction request failed"
            ) from exc
        if response.parsed is None:
            raise DocumentExtractorProviderError(
                "Gemini returned no schema-validated document candidates"
            )
        return response.parsed

    async def extract_candidates(
        self, extraction_input: DocumentExtractionInput
    ) -> DocumentCandidateExtractionResult:
        contents = extraction_input.model_dump_json(exclude_none=False)
        try:
            payload = await self._transport(
                SYSTEM_INSTRUCTION, contents, DocumentCandidateExtractionResult
            )
            result = (
                payload
                if isinstance(payload, DocumentCandidateExtractionResult)
                else DocumentCandidateExtractionResult.model_validate(payload)
            )
        except DocumentExtractorError:
            raise
        except (ValidationError, TypeError, ValueError) as exc:
            raise DocumentCandidateValidationError(
                "Gemini returned invalid document candidate structure"
            ) from exc
        except Exception as exc:
            raise DocumentExtractorProviderError(
                "Gemini document extraction transport failed"
            ) from exc
        validate_candidate_evidence(extraction_input, result)
        return result


class GroqDocumentExtractor(AbstractDocumentExtractor):
    """Document-only Groq structured extractor with no provider fallback."""

    provider_name = "Groq"

    def __init__(
        self,
        api_key: str | None,
        model_name: str,
        transport: GeminiTransport | None = None,
    ):
        if not api_key:
            raise DocumentExtractorConfigurationError(
                "Groq document extraction requires GROQ_API_KEY"
            )
        self.model_name = model_name
        self._api_key = api_key
        self._transport = transport or self._groq_transport

    async def _groq_transport(
        self,
        system_instruction: str,
        contents: str,
        response_schema: type[DocumentCandidateExtractionResult],
    ) -> Any:
        try:
            from groq import AsyncGroq

            client = AsyncGroq(api_key=self._api_key, max_retries=0, timeout=30.0)
            response = await client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": contents},
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "document_candidates",
                        "strict": True,
                        "schema": _groq_strict_json_schema(
                            response_schema.model_json_schema()
                        ),
                    },
                },
                temperature=0,
            )
        except Exception as exc:
            raise DocumentExtractorProviderError(
                "Groq document extraction request failed"
            ) from exc
        content = response.choices[0].message.content
        if not content:
            raise DocumentExtractorProviderError(
                "Groq returned no structured document candidates"
            )
        return response_schema.model_validate_json(content)

    async def extract_candidates(
        self, extraction_input: DocumentExtractionInput
    ) -> DocumentCandidateExtractionResult:
        try:
            payload = await self._transport(
                SYSTEM_INSTRUCTION,
                extraction_input.model_dump_json(exclude_none=False),
                DocumentCandidateExtractionResult,
            )
            result = (
                payload
                if isinstance(payload, DocumentCandidateExtractionResult)
                else DocumentCandidateExtractionResult.model_validate(payload)
            )
        except DocumentExtractorError:
            raise
        except (ValidationError, TypeError, ValueError) as exc:
            raise DocumentCandidateValidationError(
                "Groq returned invalid document candidate structure"
            ) from exc
        except Exception as exc:
            raise DocumentExtractorProviderError(
                "Groq document extraction transport failed"
            ) from exc
        validate_candidate_evidence(extraction_input, result)
        return result


def get_document_extractor(
    provider_name: str,
    *,
    groq_api_key: str | None,
    groq_model: str,
    gemini_api_key: str | None,
    gemini_model: str,
) -> AbstractDocumentExtractor:
    selected = provider_name.strip().lower()
    if selected == "groq":
        return GroqDocumentExtractor(groq_api_key, groq_model)
    if selected == "gemini":
        return GeminiDocumentExtractor(gemini_api_key, gemini_model)
    raise DocumentExtractorConfigurationError(
        f"Unsupported document extractor provider: {provider_name!r}"
    )


def build_document_extraction_input(
    db: Session, document: DocumentModel, run: DocumentOCRRunModel
) -> DocumentExtractionInput:
    blocks = (
        db.query(DocumentOCREvidenceModel)
        .filter_by(document_id=document.id, ocr_run_id=run.id)
        .order_by(DocumentOCREvidenceModel.block_index)
        .all()
    )
    return DocumentExtractionInput(
        document_id=document.id,
        ocr_run_id=run.id,
        document_type_hint=document.document_type,
        file_name=document.file_name,
        raw_ocr_text=run.raw_text,
        evidence_blocks=[
            PersistedOCREvidenceBlock(
                evidence_id=block.id,
                ocr_run_id=run.id,
                document_id=document.id,
                block_index=block.block_index,
                text=block.text,
                ocr_confidence=block.confidence,
                page_number=block.page_number,
                bounding_box=block.bounding_box_json,
                provider_name=run.provider_name,
                provider_version=run.provider_version,
                processed_at=run.created_at,
            )
            for block in blocks
        ],
    )


def persist_candidate_result(
    db: Session,
    extraction_input: DocumentExtractionInput,
    result: DocumentCandidateExtractionResult,
    provider_name: str,
    model_name: str,
) -> DocumentCandidateSetModel:
    validate_candidate_evidence(extraction_input, result)
    supplied_ids = {block.evidence_id for block in extraction_input.evidence_blocks}
    persisted_blocks = (
        db.query(DocumentOCREvidenceModel)
        .filter(DocumentOCREvidenceModel.id.in_(supplied_ids))
        .all()
        if supplied_ids
        else []
    )
    if len(persisted_blocks) != len(supplied_ids) or any(
        block.document_id != extraction_input.document_id
        or block.ocr_run_id != extraction_input.ocr_run_id
        for block in persisted_blocks
    ):
        raise DocumentCandidateValidationError(
            "Candidate evidence does not resolve to the supplied document and OCR run"
        )
    ocr_run_id = extraction_input.ocr_run_id
    prior_sets = (
        db.query(DocumentCandidateSetModel)
        .filter_by(
            ocr_run_id=ocr_run_id,
            provider_name=provider_name,
            model_name=model_name,
        )
        .all()
    )
    prior_set_ids = [item.id for item in prior_sets]
    if prior_set_ids:
        candidate_ids = [
            candidate_id
            for (candidate_id,) in db.query(DocumentCandidateModel.id)
            .filter(DocumentCandidateModel.candidate_set_id.in_(prior_set_ids))
            .all()
        ]
        if candidate_ids:
            db.query(DocumentCandidateEvidenceLinkModel).filter(
                DocumentCandidateEvidenceLinkModel.candidate_id.in_(candidate_ids)
            ).delete(synchronize_session=False)
            db.query(DocumentCandidateModel).filter(
                DocumentCandidateModel.id.in_(candidate_ids)
            ).delete(synchronize_session=False)
        db.query(DocumentCandidateSetModel).filter(
            DocumentCandidateSetModel.id.in_(prior_set_ids)
        ).delete(synchronize_session=False)

    candidate_set = DocumentCandidateSetModel(
        document_id=extraction_input.document_id,
        ocr_run_id=ocr_run_id,
        provider_name=provider_name,
        model_name=model_name,
    )
    db.add(candidate_set)
    db.flush()
    groups = (
        ("MEDICATION", result.medications),
        ("LAB", result.labs),
        ("HISTORICAL", result.history),
    )
    for candidate_type, candidates in groups:
        for candidate in candidates:
            stored = DocumentCandidateModel(
                candidate_set_id=candidate_set.id,
                document_id=extraction_input.document_id,
                ocr_run_id=ocr_run_id,
                candidate_type=candidate_type,
                value_json=candidate.model_dump(
                    mode="json",
                    exclude={
                        "source_evidence",
                        "extraction_confidence",
                        "status",
                    },
                ),
                extraction_confidence=candidate.extraction_confidence,
                status="NEEDS_REVIEW",
            )
            db.add(stored)
            db.flush()
            for reference in candidate.source_evidence:
                db.add(
                    DocumentCandidateEvidenceLinkModel(
                        candidate_id=stored.id,
                        evidence_id=reference.evidence_id,
                    )
                )
    return candidate_set


async def extract_and_persist_candidates(
    db: Session,
    extractor: AbstractDocumentExtractor,
    extraction_input: DocumentExtractionInput,
) -> DocumentCandidateSetModel:
    result = await extractor.extract_candidates(extraction_input)
    with db.begin_nested():
        candidate_set = persist_candidate_result(
            db,
            extraction_input,
            result,
            provider_name=str(extractor.provider_name),
            model_name=str(extractor.model_name),
        )
        db.flush()
    return candidate_set
