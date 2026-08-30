from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel


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


class OCRExtractionResult(BaseModel):
    document_type: str
    extracted_fields: Dict[str, Any]
    confidence_score: float
    pages_processed: int
    provider_name: str


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
        current_state: Dict[str, Any],
        language_code: str = "en"
    ) -> ExtractionResult:
        """Extract structured clinical findings from patient voice/text transcript."""
        pass

    @abstractmethod
    async def generate_adaptive_question(
        self,
        target_field: str,
        chief_complaint: Optional[str],
        language_code: str = "en"
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
