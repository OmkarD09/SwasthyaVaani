import os
from typing import Optional
from app.core.config import settings
from app.services.providers.base import (
    AbstractLLMProvider, AbstractSpeechProvider, AbstractOCRProvider
)
from app.services.providers.llm_provider import MockLLMProvider, GeminiLLMProvider, GroqLLMProvider
from app.services.providers.speech_provider import MockSpeechProvider, BhashiniSpeechProvider, SarvamSpeechProvider
from app.services.providers.ocr_provider import MockOCRProvider, PaddleOCRProvider
from app.services.providers.embedding_provider import (
    AbstractEmbeddingProvider, MockEmbeddingProvider, GeminiEmbeddingProvider
)


class ProviderRegistry:
    """Central dependency injection factory for swappable AI providers."""

    def __init__(self):
        self._llm_provider: Optional[AbstractLLMProvider] = None
        self._speech_provider: Optional[AbstractSpeechProvider] = None
        self._ocr_provider: Optional[AbstractOCRProvider] = None
        self._embedding_provider: Optional[AbstractEmbeddingProvider] = None

    def get_llm(self) -> AbstractLLMProvider:
        if self._llm_provider is None:
            provider_type = (getattr(settings, "PROVIDER_LLM", None) or os.getenv("PROVIDER_LLM", "mock")).lower()
            groq_key = getattr(settings, "GROQ_API_KEY", None) or os.getenv("GROQ_API_KEY")
            gemini_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")

            if provider_type == "groq" or (provider_type != "mock" and groq_key):
                self._llm_provider = GroqLLMProvider(api_key=groq_key)
            elif provider_type == "gemini" or (provider_type != "mock" and gemini_key):
                self._llm_provider = GeminiLLMProvider(api_key=gemini_key)
            else:
                self._llm_provider = MockLLMProvider()
        return self._llm_provider

    def get_speech(self) -> AbstractSpeechProvider:
        if self._speech_provider is None:
            provider_type = (getattr(settings, "PROVIDER_SPEECH", None) or os.getenv("PROVIDER_SPEECH", "mock")).lower()
            sarvam_key = getattr(settings, "SARVAM_API_KEY", None) or os.getenv("SARVAM_API_KEY")

            if provider_type == "sarvam" or (provider_type != "mock" and sarvam_key):
                self._speech_provider = SarvamSpeechProvider(api_key=sarvam_key)
            elif provider_type == "bhashini":
                self._speech_provider = BhashiniSpeechProvider(
                    api_key=getattr(settings, "BHASHINI_API_KEY", None) or os.getenv("BHASHINI_API_KEY"),
                    user_id=getattr(settings, "BHASHINI_USER_ID", None) or os.getenv("BHASHINI_USER_ID")
                )
            else:
                self._speech_provider = MockSpeechProvider()
        return self._speech_provider

    def get_ocr(self) -> AbstractOCRProvider:
        if self._ocr_provider is None:
            provider_type = (getattr(settings, "PROVIDER_OCR", None) or getattr(settings, "OCR_PROVIDER", None) or os.getenv("PROVIDER_OCR", os.getenv("OCR_PROVIDER", "mock"))).lower()
            if provider_type in ["paddle", "paddleocr"]:
                self._ocr_provider = PaddleOCRProvider()
            else:
                self._ocr_provider = MockOCRProvider()
        return self._ocr_provider

    def get_embedding(self) -> AbstractEmbeddingProvider:
        if self._embedding_provider is None:
            gemini_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
            if gemini_key:
                self._embedding_provider = GeminiEmbeddingProvider(api_key=gemini_key)
            else:
                self._embedding_provider = MockEmbeddingProvider()
        return self._embedding_provider

    def override_llm(self, provider: AbstractLLMProvider):
        """Allows test suites or dynamic runtimes to swap the provider."""
        self._llm_provider = provider

    def override_speech(self, provider: AbstractSpeechProvider):
        self._speech_provider = provider

    def override_ocr(self, provider: AbstractOCRProvider):
        self._ocr_provider = provider

    def override_embedding(self, provider: AbstractEmbeddingProvider):
        self._embedding_provider = provider


# Global singleton factory
provider_registry = ProviderRegistry()


# FastAPI Dependency Injectors
def get_llm_service() -> AbstractLLMProvider:
    return provider_registry.get_llm()


def get_speech_service() -> AbstractSpeechProvider:
    return provider_registry.get_speech()


def get_ocr_service() -> AbstractOCRProvider:
    return provider_registry.get_ocr()


def get_embedding_service() -> AbstractEmbeddingProvider:
    return provider_registry.get_embedding()
