import os
from typing import Optional
from app.services.providers.base import (
    AbstractLLMProvider, AbstractSpeechProvider, AbstractOCRProvider
)
from app.services.providers.llm_provider import MockLLMProvider, GeminiLLMProvider
from app.services.providers.speech_provider import MockSpeechProvider, BhashiniSpeechProvider, SarvamSpeechProvider
from app.services.providers.ocr_provider import MockOCRProvider, PaddleOCRProvider


class ProviderRegistry:
    """Central dependency injection factory for swappable AI providers."""

    def __init__(self):
        self._llm_provider: Optional[AbstractLLMProvider] = None
        self._speech_provider: Optional[AbstractSpeechProvider] = None
        self._ocr_provider: Optional[AbstractOCRProvider] = None

    def get_llm(self) -> AbstractLLMProvider:
        if self._llm_provider is None:
            provider_type = os.getenv("PROVIDER_LLM", "mock").lower()
            if provider_type == "gemini":
                self._llm_provider = GeminiLLMProvider(api_key=os.getenv("GEMINI_API_KEY"))
            else:
                self._llm_provider = MockLLMProvider()
        return self._llm_provider

    def get_speech(self) -> AbstractSpeechProvider:
        if self._speech_provider is None:
            provider_type = os.getenv("PROVIDER_SPEECH", "mock").lower()
            if provider_type == "sarvam":
                self._speech_provider = SarvamSpeechProvider(
                    api_key=os.getenv("SARVAM_API_KEY")
                )
            elif provider_type == "bhashini":
                self._speech_provider = BhashiniSpeechProvider(
                    api_key=os.getenv("BHASHINI_API_KEY"),
                    user_id=os.getenv("BHASHINI_USER_ID")
                )
            else:
                self._speech_provider = MockSpeechProvider()
        return self._speech_provider

    def get_ocr(self) -> AbstractOCRProvider:
        if self._ocr_provider is None:
            provider_type = os.getenv("PROVIDER_OCR", "mock").lower()
            if provider_type == "paddle":
                self._ocr_provider = PaddleOCRProvider()
            else:
                self._ocr_provider = MockOCRProvider()
        return self._ocr_provider

    def override_llm(self, provider: AbstractLLMProvider):
        """Allows test suites or dynamic runtimes to swap the provider."""
        self._llm_provider = provider

    def override_speech(self, provider: AbstractSpeechProvider):
        self._speech_provider = provider

    def override_ocr(self, provider: AbstractOCRProvider):
        self._ocr_provider = provider


# Global singleton factory
provider_registry = ProviderRegistry()


# FastAPI Dependency Injectors
def get_llm_service() -> AbstractLLMProvider:
    return provider_registry.get_llm()


def get_speech_service() -> AbstractSpeechProvider:
    return provider_registry.get_speech()


def get_ocr_service() -> AbstractOCRProvider:
    return provider_registry.get_ocr()
