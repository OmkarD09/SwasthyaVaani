import math
import time
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.schemas.rag import RAGContext, RetrievedChunk, KnowledgeDocumentCreate
from app.services.providers.factory import get_embedding_service
from app.services.rag.ayush_seed_data import AYUSH_REFERENCE_DOCUMENTS

logger = logging.getLogger(__name__)


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
    sim = dot / (mag1 * mag2)
    # Bound between 0.0 and 1.0
    return max(0.0, min(1.0, float(sim)))


class RAGService:
    """Production-oriented semantic retrieval service for clinical knowledge grounding."""

    def __init__(self):
        self._seeded = False

    async def seed_ayush_knowledge_if_empty(self, db: Session) -> int:
        """Seed baseline AYUSH reference guidelines into database if no documents exist."""
        existing_count = db.query(KnowledgeDocument).count()
        if existing_count > 0:
            return existing_count

        embedding_svc = get_embedding_service()
        seeded_count = 0

        for doc_data in AYUSH_REFERENCE_DOCUMENTS:
            doc = KnowledgeDocument(
                title=doc_data["title"],
                source=doc_data["source"],
                source_type=doc_data["source_type"],
                version=doc_data["version"],
                language=doc_data["language"],
                workflow=doc_data["workflow"],
                status="ACTIVE"
            )
            db.add(doc)
            db.flush()

            for idx, chunk_data in enumerate(doc_data["chunks"]):
                vec = await embedding_svc.embed_text(chunk_data["content"])
                chunk = KnowledgeChunk(
                    document_id=doc.id,
                    chunk_index=idx,
                    content=chunk_data["content"],
                    language=chunk_data.get("language", "en"),
                    workflow=chunk_data.get("workflow", "AYUSH"),
                    topic=chunk_data["topic"],
                    source=doc_data["source"],
                    version=doc_data["version"],
                    embedding=vec
                )
                db.add(chunk)

            seeded_count += 1

        db.commit()
        logger.info(f"[RAGService] Successfully seeded {seeded_count} AYUSH knowledge documents.")
        return seeded_count

    async def ingest_document(
        self,
        db: Session,
        doc_in: KnowledgeDocumentCreate,
        chunks_data: Optional[List[Dict[str, Any]]] = None
    ) -> KnowledgeDocument:
        """Ingest a new knowledge document with chunking and embeddings."""
        embedding_svc = get_embedding_service()

        doc = KnowledgeDocument(
            title=doc_in.title,
            source=doc_in.source,
            source_type=doc_in.source_type,
            version=doc_in.version,
            language=doc_in.language,
            workflow=doc_in.workflow,
            status=doc_in.status
        )
        db.add(doc)
        db.flush()

        # If raw content provided without pre-split chunks, split into paragraphs
        if not chunks_data and doc_in.content_raw:
            paragraphs = [p.strip() for p in doc_in.content_raw.split("\n\n") if len(p.strip()) > 20]
            chunks_data = [{"topic": f"section_{i+1}", "content": p} for i, p in enumerate(paragraphs)]

        if chunks_data:
            for idx, chk in enumerate(chunks_data):
                vec = await embedding_svc.embed_text(chk["content"])
                chunk_obj = KnowledgeChunk(
                    document_id=doc.id,
                    chunk_index=idx,
                    content=chk["content"],
                    language=chk.get("language", doc_in.language),
                    workflow=chk.get("workflow", doc_in.workflow),
                    topic=chk.get("topic", "clinical_guidance"),
                    source=doc_in.source,
                    version=doc_in.version,
                    embedding=vec
                )
                db.add(chunk_obj)

        db.commit()
        db.refresh(doc)
        return doc

    async def retrieve(
        self,
        query: str,
        db: Session,
        workflow: Optional[str] = "AYUSH",
        language: Optional[str] = "en",
        top_k: int = 5,
        min_similarity: float = 0.50
    ) -> RAGContext:
        """
        Perform semantic similarity retrieval against knowledge chunks.
        Returns validated RAGContext with similarity-ranked chunks and latency telemetry.
        """
        t0 = time.perf_counter()
        clean_query = query.strip()
        if not clean_query:
            return RAGContext(query="", has_relevant_context=False, retrieval_latency_ms=0.0)

        try:
            # Ensure baseline AYUSH documents exist
            await self.seed_ayush_knowledge_if_empty(db)

            embedding_svc = get_embedding_service()
            query_vec = await embedding_svc.embed_text(clean_query)

            # Query candidate chunks filtered by workflow
            query_stmt = db.query(KnowledgeChunk, KnowledgeDocument).join(
                KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id
            ).filter(KnowledgeDocument.status == "ACTIVE")

            if workflow and workflow != "ALL":
                query_stmt = query_stmt.filter(
                    (KnowledgeChunk.workflow == workflow) | (KnowledgeChunk.workflow == "ALL")
                )

            chunk_records = query_stmt.all()
            scored_results: List[RetrievedChunk] = []

            for chunk, doc in chunk_records:
                if not chunk.embedding:
                    continue

                sim = cosine_similarity(query_vec, chunk.embedding)
                if sim >= min_similarity:
                    scored_results.append(
                        RetrievedChunk(
                            chunk_id=chunk.id,
                            document_id=doc.id,
                            title=doc.title,
                            source=doc.source,
                            version=doc.version,
                            topic=chunk.topic,
                            content=chunk.content,
                            similarity_score=round(sim, 4)
                        )
                    )

            # Sort descending by similarity
            scored_results.sort(key=lambda x: x.similarity_score, reverse=True)
            top_results = scored_results[:top_k]

            latency_ms = (time.perf_counter() - t0) * 1000
            has_relevant = len(top_results) > 0

            return RAGContext(
                query=clean_query,
                workflow=workflow,
                language=language,
                results=top_results,
                has_relevant_context=has_relevant,
                retrieval_latency_ms=round(latency_ms, 2)
            )

        except Exception as e:
            logger.error(f"[RAGService] Retrieval exception: {e}")
            latency_ms = (time.perf_counter() - t0) * 1000
            return RAGContext(
                query=clean_query,
                workflow=workflow,
                language=language,
                results=[],
                has_relevant_context=False,
                retrieval_latency_ms=round(latency_ms, 2)
            )


# Global singleton instance
rag_service = RAGService()
