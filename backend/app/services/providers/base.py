from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class ExtractionResult(BaseModel):
    extracted_facts: Dict[str, Any]
    confidence: float
    raw_response: Optional[str] = None
    provider_name: str


class TranscriptionResult(BaseModel):
    transcript_text: str
    detected_language: str
    confidence: float
    provider_name: str


class TranslationResult(BaseModel):
    source_language: str
    target_language: str
    translated_text: str
    provider_name: str


# --- Normalized OCR Data Structures ---

class OCRBlock(BaseModel):
    """Normalized atomic block of recognized text with confidence and bounding box."""
    text: str
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    bounding_box: Optional[List[List[float]]] = None  # [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    page_number: int = 1


class NormalizedOCRResult(BaseModel):
    """Normalized intermediate OCR payload consumed by Document Intelligence services."""
    raw_text: str
    blocks: List[OCRBlock] = Field(default_factory=list)
    average_confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    pages_processed: int = 1
    provider_name: str = "PaddleOCR"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class OCRExtractionResult(BaseModel):
    """High-level clinical structured extraction result returned by OCR providers."""
    document_type: str  # PRESCRIPTION, LAB_REPORT, DISCHARGE_SUMMARY, UNKNOWN
    extracted_fields: Dict[str, Any] = Field(default_factory=dict)
    confidence_score: float = Field(default=0.9, ge=0.0, le=1.0)
    pages_processed: int = 1
    provider_name: str
    raw_text: Optional[str] = None
    blocks: Optional[List[OCRBlock]] = None
    normalized_ocr: Optional[NormalizedOCRResult] = None
    review_status: str = "NEEDS_REVIEW"  # PROCESSED, NEEDS_REVIEW, FAILED


# --- Provider Abstract Interfaces ---

# 1. LLM Service Interface
class AbstractLLMProvider(ABC):
    @abstractmethod
    async def extract_clinical_facts(
        self,
        raw_text: str,
        current_state: Any,
        language_code: str = "en",
        target_field: str = "chief_complaint"
    ) -> ExtractionResult:
        """Extract structured clinical entities from patient responses."""
        pass

    @abstractmethod
    async def generate_adaptive_question(
        self,
        target_field: str,
        chief_complaint: Optional[str],
        language_code: str = "en",
        rag_context: Optional[Any] = None
    ) -> str:
        """Generate dynamic clinical question if deterministic fallback is not used."""
        pass


# 2. Speech-to-Text Service Interface
class AbstractSpeechProvider(ABC):
    @abstractmethod
    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        language_code: Optional[str] = None
    ) -> TranscriptionResult:
        """Transcribe incoming patient audio into normalized text."""
        pass

    @abstractmethod
    async def text_to_speech(
        self,
        text: str,
        language_code: Optional[str] = None
    ) -> Optional[str]:
        """Synthesize spoken audio from clinical text."""
        pass


# 3. Document OCR Service Interface
class AbstractOCRProvider(ABC):
    @abstractmethod
    async def process_document(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str
    ) -> OCRExtractionResult:
        """Extract structured clinical entities from uploaded prescription or lab report."""
        pass


# 4. Translation Service Interface
class AbstractTranslationProvider(ABC):
    @abstractmethod
    async def translate_text(
        self,
        text: str,
        source_lang: str,
        target_lang: str
    ) -> TranslationResult:
        """Translate clinical questions or transcripts across Indic languages."""
        pass
