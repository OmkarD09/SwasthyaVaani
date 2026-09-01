"""persist normalized OCR runs and evidence blocks

Revision ID: 9a72e4c18f31
Revises: 6f3a1c9d8b42
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "9a72e4c18f31"
down_revision: str | Sequence[str] | None = "6f3a1c9d8b42"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "document_ocr_runs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("provider_name", sa.String(), nullable=False),
        sa.Column("provider_version", sa.String(), nullable=False),
        sa.Column("aggregate_confidence", sa.Float(), nullable=False),
        sa.Column("pages_processed", sa.Integer(), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_document_ocr_runs_document_id",
        "document_ocr_runs",
        ["document_id"],
        unique=False,
    )
    op.create_table(
        "document_ocr_evidence",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("ocr_run_id", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("block_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("bounding_box_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.ForeignKeyConstraint(["ocr_run_id"], ["document_ocr_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "ocr_run_id", "block_index", name="uq_ocr_evidence_run_block"
        ),
    )
    op.create_index(
        "ix_document_ocr_evidence_document_id",
        "document_ocr_evidence",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        "ix_document_ocr_evidence_ocr_run_id",
        "document_ocr_evidence",
        ["ocr_run_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_document_ocr_evidence_ocr_run_id",
        table_name="document_ocr_evidence",
    )
    op.drop_index(
        "ix_document_ocr_evidence_document_id",
        table_name="document_ocr_evidence",
    )
    op.drop_table("document_ocr_evidence")
    op.drop_index(
        "ix_document_ocr_runs_document_id", table_name="document_ocr_runs"
    )
    op.drop_table("document_ocr_runs")
