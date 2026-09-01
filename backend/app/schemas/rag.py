from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RetrievedChunk(BaseModel):
    """Strongly-typed knowledge chunk retrieved from vector similarity search."""
    chunk_id: str
    document_id: str
    title: str
    source: str
    version: str
    topic: str
    content: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)


class RAGContext(BaseModel):
    """Validated context container provided to LLMs and downstream clinical engines."""
    query: str
    workflow: str | None = None
    language: str | None = None
    results: list[RetrievedChunk] = Field(default_factory=list)
    has_relevant_context: bool = False
    retrieval_latency_ms: float = 0.0
    retrieval_status: Literal["READY", "DEGRADED"] = "READY"
    embedding_provider: str | None = None
    degraded_reason: str | None = None


class KnowledgeDocumentCreate(BaseModel):
    title: str
    source: str
    source_type: Literal["AYUSH_REFERENCE", "CLINICAL_REFERENCE", "QUESTION_BANK", "WORKFLOW_GUIDANCE"] = "AYUSH_REFERENCE"
    version: str = "1.0"
    language: str = "en"
    workflow: str = "AYUSH"
    status: str = "ACTIVE"
    content_raw: str | None = None


class KnowledgeChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    chunk_index: int
    content: str
    language: str
    workflow: str
    topic: str
    source: str
    version: str
    created_at: datetime


class KnowledgeDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    source: str
    source_type: str
    version: str
    language: str
    workflow: str
    status: str
    created_at: datetime
    updated_at: datetime
    chunks: list[KnowledgeChunkResponse] | None = None


class RAGQueryRequest(BaseModel):
    query: str
    workflow: str | None = "AYUSH"
    language: str | None = "en"
    top_k: int = Field(default=5, ge=1, le=20)
    min_similarity: float = Field(default=0.50, ge=0.0, le=1.0)
