from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class ExtractionResult(BaseModel):
    extracted_facts: dict[str, Any]
    confidence: float
    raw_response: str | None = None
    provider_name: str


class TranscriptionResult(BaseModel):
    transcript_text: str
    detected_language: str
    confidence: float
    provider_name: str


class OCRBlock(BaseModel):
    """Normalized atomic block of recognized text with confidence and bounding box."""
    text: str
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    bounding_box: list[list[float]] | None = None  # [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    page_number: int = 1


class NormalizedOCRResult(BaseModel):
    """Normalized intermediate OCR payload consumed by Document Intelligence services."""
    raw_text: str
    blocks: list[OCRBlock] = Field(default_factory=list)
    average_confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    pages_processed: int = 1
    provider_name: str = "PaddleOCR"
    metadata: dict[str, Any] = Field(default_factory=dict)


class OCRExtractionResult(BaseModel):
    document_type: str
    extracted_fields: dict[str, Any]
    confidence_score: float
    pages_processed: int
    provider_name: str
    provider_version: str = "unknown"
    raw_text: str = ""
    text_blocks: list[dict[str, Any]] = Field(default_factory=list)
    blocks: list[OCRBlock] | None = None
    normalized_ocr: NormalizedOCRResult | None = None
    review_status: str = "NEEDS_REVIEW"  # PROCESSED, NEEDS_REVIEW, FAILED


class TranslationResult(BaseModel):
    source_language: str
    target_language: str
    translated_text: str
    provider_name: str


# 1. LLM Service Interface
class AbstractLLMProvider(ABC):
    @abstractmethod
    async def extract_clinical_facts(
        self,
        raw_text: str,
        current_state: Any,
        language_code: str = "en",
        target_field: str = "chief_complaint",
    ) -> ExtractionResult:
        """Extract structured clinical findings from patient voice/text transcript."""

    @abstractmethod
    async def generate_adaptive_question(
        self,
        target_field: str,
        chief_complaint: str | None,
        language_code: str = "en",
        rag_context: Any | None = None,
    ) -> str:
        """Generate dynamic clinical question if deterministic fallback is not used."""


# 2. Speech-to-Text Service Interface
class AbstractSpeechProvider(ABC):
    @abstractmethod
    async def transcribe_audio(
        self, audio_bytes: bytes, language_code: str | None = None
    ) -> TranscriptionResult:
        """Transcribe incoming patient audio into normalized text."""

    @abstractmethod
    async def text_to_speech(
        self, text: str, language_code: str | None = None
    ) -> str | None:
        """Synthesize spoken audio for patient-facing questions."""


# 3. Document OCR Service Interface
class AbstractOCRProvider(ABC):
    @abstractmethod
    async def process_document(
        self, file_bytes: bytes, filename: str, mime_type: str
    ) -> OCRExtractionResult:
        """Extract structured clinical entities from uploaded prescription or lab report."""


# 4. Translation Service Interface
class AbstractTranslationProvider(ABC):
    @abstractmethod
    async def translate_text(
        self, text: str, source_lang: str, target_lang: str
    ) -> TranslationResult:
        """Translate clinical questions or transcripts across Indic languages."""
