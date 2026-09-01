"""persist document candidates and evidence links

Revision ID: c4e8d2a71b09
Revises: 9a72e4c18f31
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c4e8d2a71b09"
down_revision: str | Sequence[str] | None = "9a72e4c18f31"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "document_candidate_sets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("ocr_run_id", sa.String(), nullable=False),
        sa.Column("provider_name", sa.String(), nullable=False),
        sa.Column("model_name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.ForeignKeyConstraint(["ocr_run_id"], ["document_ocr_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "ocr_run_id",
            "provider_name",
            "model_name",
            name="uq_candidate_set_run_provider_model",
        ),
    )
    op.create_index(
        "ix_document_candidate_sets_document_id",
        "document_candidate_sets",
        ["document_id"],
    )
    op.create_index(
        "ix_document_candidate_sets_ocr_run_id",
        "document_candidate_sets",
        ["ocr_run_id"],
    )
    op.create_table(
        "document_candidates",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("candidate_set_id", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("ocr_run_id", sa.String(), nullable=False),
        sa.Column("candidate_type", sa.String(), nullable=False),
        sa.Column("value_json", sa.JSON(), nullable=False),
        sa.Column("extraction_confidence", sa.Float(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_set_id"], ["document_candidate_sets.id"]),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.ForeignKeyConstraint(["ocr_run_id"], ["document_ocr_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_document_candidates_candidate_set_id",
        "document_candidates",
        ["candidate_set_id"],
    )
    op.create_index(
        "ix_document_candidates_document_id",
        "document_candidates",
        ["document_id"],
    )
    op.create_index(
        "ix_document_candidates_ocr_run_id",
        "document_candidates",
        ["ocr_run_id"],
    )
    op.create_table(
        "document_candidate_evidence_links",
        sa.Column("candidate_id", sa.String(), nullable=False),
        sa.Column("evidence_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["document_candidates.id"]),
        sa.ForeignKeyConstraint(["evidence_id"], ["document_ocr_evidence.id"]),
        sa.PrimaryKeyConstraint("candidate_id", "evidence_id"),
    )


def downgrade() -> None:
    op.drop_table("document_candidate_evidence_links")
    op.drop_index("ix_document_candidates_ocr_run_id", table_name="document_candidates")
    op.drop_index("ix_document_candidates_document_id", table_name="document_candidates")
    op.drop_index(
        "ix_document_candidates_candidate_set_id", table_name="document_candidates"
    )
    op.drop_table("document_candidates")
    op.drop_index(
        "ix_document_candidate_sets_ocr_run_id",
        table_name="document_candidate_sets",
    )
    op.drop_index(
        "ix_document_candidate_sets_document_id",
        table_name="document_candidate_sets",
    )
    op.drop_table("document_candidate_sets")
