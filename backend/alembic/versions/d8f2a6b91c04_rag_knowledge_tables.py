"""add RAG knowledge documents and chunks

Revision ID: d8f2a6b91c04
Revises: c4e8d2a71b09
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d8f2a6b91c04"
down_revision: str | Sequence[str] | None = "c4e8d2a71b09"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("version", sa.String(), nullable=True),
        sa.Column("language", sa.String(), nullable=True),
        sa.Column("workflow", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_knowledge_documents_workflow_status",
        "knowledge_documents",
        ["workflow", "status"],
    )
    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("language", sa.String(), nullable=True),
        sa.Column("workflow", sa.String(), nullable=True),
        sa.Column("topic", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("version", sa.String(), nullable=True),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["document_id"], ["knowledge_documents.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "document_id", "chunk_index", name="uq_knowledge_chunk_document_index"
        ),
    )
    op.create_index(
        "ix_knowledge_chunks_document_id",
        "knowledge_chunks",
        ["document_id"],
    )
    op.create_index(
        "ix_knowledge_chunks_workflow",
        "knowledge_chunks",
        ["workflow"],
    )


def downgrade() -> None:
    op.drop_index("ix_knowledge_chunks_workflow", table_name="knowledge_chunks")
    op.drop_index("ix_knowledge_chunks_document_id", table_name="knowledge_chunks")
    op.drop_table("knowledge_chunks")
    op.drop_index(
        "ix_knowledge_documents_workflow_status",
        table_name="knowledge_documents",
    )
    op.drop_table("knowledge_documents")
