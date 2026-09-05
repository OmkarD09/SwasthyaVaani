import abc
import hashlib
import logging
import math

logger = logging.getLogger(__name__)


class EmbeddingProviderError(RuntimeError):
    """Base error for application embedding providers."""


class EmbeddingProviderConfigurationError(EmbeddingProviderError):
    """Raised when a selected embedding provider cannot be configured."""


class EmbeddingProviderRequestError(EmbeddingProviderError):
    """Raised when real embedding generation fails."""


def l2_normalize(vector: list[float]) -> list[float]:
    """Normalize a vector to unit length (L2 norm)."""
    norm = math.sqrt(sum(x * x for x in vector))
    if norm == 0.0:
        return vector
    return [x / norm for x in vector]


class AbstractEmbeddingProvider(abc.ABC):
    """Abstract interface for text embedding models."""

    @abc.abstractmethod
    async def embed_text(self, text: str) -> list[float]:
        """Generate a dense embedding vector for a single string."""

    @abc.abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""


class MockEmbeddingProvider(AbstractEmbeddingProvider):
    """
    Deterministic, zero-latency embedding generator for offline execution and testing.
    Uses token n-gram feature hashing with L2 normalization to produce semantically consistent vectors.
    """

    def __init__(self, dimension: int = 128):
        self.dimension = dimension

    def _hash_to_vector(self, text: str) -> list[float]:
        clean_text = text.lower().strip()
        tokens = (
            clean_text.replace(",", " ").replace(".", " ").replace("?", " ").split()
        )

        vec = [0.0] * self.dimension
        if not tokens:
            return vec

        for token in tokens:
            # Hash individual token
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if (h // self.dimension) % 2 == 0 else -1.0
            vec[idx] += sign

            # Bigrams for local context matching
            for i in range(len(token) - 2):
                tri = token[i : i + 3]
                h_tri = int(hashlib.md5(tri.encode("utf-8")).hexdigest(), 16)
                idx_tri = h_tri % self.dimension
                vec[idx_tri] += 0.5

        return l2_normalize(vec)

    async def embed_text(self, text: str) -> list[float]:
        return self._hash_to_vector(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self._hash_to_vector(t) for t in texts]


class GeminiEmbeddingProvider(AbstractEmbeddingProvider):
    """Google Gemini embedding provider with explicit failure behavior."""

    def __init__(self, api_key: str | None = None, model: str = "gemini-embedding-2"):
        self.api_key = api_key
        self.model = model
        if not self.api_key:
            raise EmbeddingProviderConfigurationError(
                "EMBEDDING_PROVIDER=gemini requires GEMINI_API_KEY"
            )
        try:
            from google import genai

            self._client = genai.Client(api_key=self.api_key)
        except Exception as exc:
            raise EmbeddingProviderConfigurationError(
                "Gemini embedding client initialization failed"
            ) from exc

    async def embed_text(self, text: str) -> list[float]:
        try:
            res = self._client.models.embed_content(model=self.model, contents=text)
            if hasattr(res, "embedding") and hasattr(res.embedding, "values"):
                return l2_normalize(list(res.embedding.values))
            elif hasattr(res, "embeddings") and len(res.embeddings) > 0:
                return l2_normalize(list(res.embeddings[0].values))
            raise EmbeddingProviderRequestError("Gemini returned no embedding values")
        except EmbeddingProviderError:
            raise
        except Exception as exc:
            raise EmbeddingProviderRequestError(
                "Gemini embedding request failed"
            ) from exc

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = []
        for t in texts:
            results.append(await self.embed_text(t))
        return results
