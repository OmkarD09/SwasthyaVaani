from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin, require_doctor
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.schemas.rag import (
    KnowledgeDocumentCreate,
    KnowledgeDocumentResponse,
    RAGContext,
    RAGQueryRequest,
)
from app.services.providers.factory import get_embedding_service
from app.services.rag.rag_service import rag_service

router = APIRouter(prefix="/rag", tags=["RAG Knowledge Engine"])


@router.get("/status")
def get_rag_status(db: Session = Depends(get_db)):
    """Retrieve operational health, chunk counts, and active embedding provider status."""
    doc_count = db.query(KnowledgeDocument).count()
    chunk_count = db.query(KnowledgeChunk).count()
    embedding_svc = get_embedding_service()

    return {
        "status": "ONLINE",
        "service": "SwasthyaVaani RAG Knowledge-Grounding Engine",
        "primary_workflow": "AYUSH",
        "total_documents": doc_count,
        "total_chunks": chunk_count,
        "embedding_provider": embedding_svc.__class__.__name__,
        "vector_search_engine": "Python cosine similarity over JSON embeddings",
        "default_min_similarity": 0.50,
    }


@router.get("/documents", response_model=list[KnowledgeDocumentResponse])
def list_knowledge_documents(
    workflow: str | None = None,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(require_doctor),
):
    """List all authoritative knowledge documents registered in the system."""
    query = db.query(KnowledgeDocument)
    if workflow:
        query = query.filter(
            (KnowledgeDocument.workflow == workflow)
            | (KnowledgeDocument.workflow == "ALL")
        )
    return query.order_by(KnowledgeDocument.created_at.desc()).all()


@router.post(
    "/documents",
    response_model=KnowledgeDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_knowledge_document(
    doc_in: KnowledgeDocumentCreate,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(require_admin),
):
    """Ingest a new authoritative clinical reference document with embeddings."""
    try:
        doc = await rag_service.ingest_document(db=db, doc_in=doc_in)
        return doc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ingest knowledge document safely",
        ) from exc


@router.post("/query", response_model=RAGContext)
async def query_knowledge_base(
    req: RAGQueryRequest,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(require_doctor),
):
    """Perform semantic vector retrieval against the clinical knowledge base."""
    rag_ctx = await rag_service.retrieve(
        query=req.query,
        db=db,
        workflow=req.workflow,
        language=req.language,
        top_k=req.top_k,
        min_similarity=req.min_similarity,
    )
    if rag_ctx.retrieval_status == "READY":
        db.commit()
    return rag_ctx
