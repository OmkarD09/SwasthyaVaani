import abc
import math
import hashlib
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


def l2_normalize(vector: List[float]) -> List[float]:
    """Normalize a vector to unit length (L2 norm)."""
    norm = math.sqrt(sum(x * x for x in vector))
    if norm == 0.0:
        return vector
    return [x / norm for x in vector]


class AbstractEmbeddingProvider(abc.ABC):
    """Abstract interface for text embedding models."""

    @abc.abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generate a dense embedding vector for a single string."""
        pass

    @abc.abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        pass


class MockEmbeddingProvider(AbstractEmbeddingProvider):
    """
    Deterministic, zero-latency embedding generator for offline execution and testing.
    Uses token n-gram feature hashing with L2 normalization to produce semantically consistent vectors.
    """

    def __init__(self, dimension: int = 128):
        self.dimension = dimension

    def _hash_to_vector(self, text: str) -> List[float]:
        clean_text = text.lower().strip()
        tokens = clean_text.replace(",", " ").replace(".", " ").replace("?", " ").split()
        
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
                tri = token[i:i+3]
                h_tri = int(hashlib.md5(tri.encode("utf-8")).hexdigest(), 16)
                idx_tri = h_tri % self.dimension
                vec[idx_tri] += 0.5

        return l2_normalize(vec)

    async def embed_text(self, text: str) -> List[float]:
        return self._hash_to_vector(text)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_to_vector(t) for t in texts]


class GeminiEmbeddingProvider(AbstractEmbeddingProvider):
    """Google Gemini Embedding-2 Provider with automatic fallback."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-embedding-2"):
        self.api_key = api_key
        self.model = model
        self.fallback = MockEmbeddingProvider()
        self._client = None
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"[GeminiEmbeddingProvider] Client init warning: {e}")

    async def embed_text(self, text: str) -> List[float]:
        if not self._client or not self.api_key:
            return await self.fallback.embed_text(text)

        try:
            res = self._client.models.embed_content(
                model=self.model,
                contents=text
            )
            if hasattr(res, "embedding") and hasattr(res.embedding, "values"):
                return l2_normalize(list(res.embedding.values))
            elif hasattr(res, "embeddings") and len(res.embeddings) > 0:
                return l2_normalize(list(res.embeddings[0].values))
            return await self.fallback.embed_text(text)
        except Exception as e:
            logger.warning(f"[GeminiEmbeddingProvider] Live embedding error, using fallback: {e}")
            return await self.fallback.embed_text(text)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        results = []
        for t in texts:
            results.append(await self.embed_text(t))
        return results
