
from app.core.config import settings
from app.services.providers.base import (
    AbstractLLMProvider,
    AbstractOCRProvider,
    AbstractSpeechProvider,
)


class ProviderConfigurationError(RuntimeError):
    """Raised when an explicitly selected application provider is invalid."""
from app.services.providers.embedding_provider import (
    AbstractEmbeddingProvider,
    GeminiEmbeddingProvider,
    MockEmbeddingProvider,
)
from app.services.providers.llm_provider import (
    GeminiLLMProvider,
    GroqLLMProvider,
    MockLLMProvider,
)
from app.services.providers.ocr_provider import MockOCRProvider, PaddleOCRProvider
from app.services.providers.speech_provider import (
    BhashiniSpeechProvider,
    MockSpeechProvider,
    SarvamSpeechProvider,
)


class ProviderRegistry:
    """Central dependency injection factory for swappable AI providers."""

    def __init__(self):
        self._llm_provider: AbstractLLMProvider | None = None
        self._speech_provider: AbstractSpeechProvider | None = None
        self._ocr_provider: AbstractOCRProvider | None = None
        self._embedding_provider: AbstractEmbeddingProvider | None = None

    def get_llm(self) -> AbstractLLMProvider:
        if self._llm_provider is None:
            provider_type = settings.PROVIDER_LLM.strip().lower()
            if provider_type == "groq":
                self._llm_provider = GroqLLMProvider(api_key=settings.GROQ_API_KEY)
            elif provider_type == "gemini":
                self._llm_provider = GeminiLLMProvider(api_key=settings.GEMINI_API_KEY)
            elif provider_type == "mock":
                self._llm_provider = MockLLMProvider()
            else:
                raise ProviderConfigurationError(
                    f"Unsupported patient LLM provider: {settings.PROVIDER_LLM!r}"
                )
        return self._llm_provider

    def get_speech(self) -> AbstractSpeechProvider:
        if self._speech_provider is None:
            provider_type = settings.PROVIDER_SPEECH.strip().lower()
            sarvam_key = settings.SARVAM_API_KEY

            if provider_type == "sarvam":
                self._speech_provider = SarvamSpeechProvider(api_key=sarvam_key)
            elif provider_type == "bhashini":
                self._speech_provider = BhashiniSpeechProvider(
                    api_key=settings.BHASHINI_API_KEY,
                    user_id=settings.BHASHINI_USER_ID,
                )
            elif provider_type == "mock":
                self._speech_provider = MockSpeechProvider()
            else:
                raise ProviderConfigurationError(
                    f"Unsupported speech provider: {settings.PROVIDER_SPEECH!r}"
                )
        return self._speech_provider

    def get_ocr(self) -> AbstractOCRProvider:
        if self._ocr_provider is None:
            provider_type = settings.PROVIDER_OCR.strip().lower()
            if provider_type in ["paddle", "paddleocr"]:
                self._ocr_provider = PaddleOCRProvider()
            elif provider_type == "mock":
                self._ocr_provider = MockOCRProvider()
            else:
                raise ProviderConfigurationError(
                    f"Unsupported OCR provider: {settings.PROVIDER_OCR!r}"
                )
        return self._ocr_provider

    def get_embedding(self) -> AbstractEmbeddingProvider:
        if self._embedding_provider is None:
            provider_type = settings.EMBEDDING_PROVIDER.strip().lower()
            if provider_type == "gemini":
                self._embedding_provider = GeminiEmbeddingProvider(
                    api_key=settings.GEMINI_API_KEY
                )
            elif provider_type == "mock":
                self._embedding_provider = MockEmbeddingProvider()
            else:
                raise ProviderConfigurationError(
                    f"Unsupported embedding provider: {settings.EMBEDDING_PROVIDER!r}"
                )
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
