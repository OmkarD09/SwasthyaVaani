"""add document intelligence metadata and provenance

Revision ID: 6f3a1c9d8b42
Revises: 2c1db709b90d
Create Date: 2026-08-31
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "6f3a1c9d8b42"
down_revision: str | Sequence[str] | None = "2c1db709b90d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    document_columns = {column["name"] for column in inspector.get_columns("documents")}
    document_indexes = {index["name"] for index in inspector.get_indexes("documents")}
    with op.batch_alter_table("documents") as batch_op:
        if "sha256" not in document_columns:
            batch_op.add_column(
                sa.Column("sha256", sa.String(length=64), nullable=True)
            )
        if "page_count" not in document_columns:
            batch_op.add_column(
                sa.Column(
                    "page_count", sa.Integer(), nullable=False, server_default="1"
                )
            )
        if "failure_code" not in document_columns:
            batch_op.add_column(sa.Column("failure_code", sa.String(), nullable=True))
        if "ix_documents_sha256" not in document_indexes:
            batch_op.create_index("ix_documents_sha256", ["sha256"], unique=False)
        if "ix_documents_status" not in document_indexes:
            batch_op.create_index("ix_documents_status", ["status"], unique=False)

    extraction_columns = {
        column["name"] for column in inspector.get_columns("document_extractions")
    }
    additions = (
        sa.Column("ocr_confidence", sa.Float(), nullable=True),
        sa.Column("extraction_confidence", sa.Float(), nullable=True),
        sa.Column("source_region_json", sa.JSON(), nullable=True),
        sa.Column("original_source_text", sa.Text(), nullable=True),
        sa.Column("ocr_engine", sa.String(), nullable=True),
        sa.Column("ocr_engine_version", sa.String(), nullable=True),
        sa.Column("extractor_version", sa.String(), nullable=True),
    )
    for column in additions:
        if column.name not in extraction_columns:
            op.add_column("document_extractions", column)


def downgrade() -> None:
    with op.batch_alter_table("document_extractions") as batch_op:
        batch_op.drop_column("extractor_version")
        batch_op.drop_column("ocr_engine_version")
        batch_op.drop_column("ocr_engine")
        batch_op.drop_column("original_source_text")
        batch_op.drop_column("source_region_json")
        batch_op.drop_column("extraction_confidence")
        batch_op.drop_column("ocr_confidence")

    with op.batch_alter_table("documents") as batch_op:
        batch_op.drop_index("ix_documents_status")
        batch_op.drop_index("ix_documents_sha256")
        batch_op.drop_column("failure_code")
        batch_op.drop_column("page_count")
        batch_op.drop_column("sha256")
