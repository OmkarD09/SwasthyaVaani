"""add ayush_assessments table

Revision ID: e5f1b2c3d4e5
Revises: d8f2a6b91c04
Create Date: 2026-09-05
"""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "e5f1b2c3d4e5"
down_revision: str | Sequence[str] | None = "b4f08c2e6a91"
branch_labels: str | Sequence[str] | None = None


depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ayush_assessments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("intake_session_id", sa.String(), nullable=False),
        sa.Column("system", sa.String(), nullable=False, server_default="AYURVEDA"),
        sa.Column("status", sa.String(), nullable=False, server_default="INCOMPLETE"),
        sa.Column("assessment_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["intake_session_id"], ["intake_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("intake_session_id"),
    )
    op.create_index(
        op.f("ix_ayush_assessments_intake_session_id"),
        "ayush_assessments",
        ["intake_session_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_ayush_assessments_status"),
        "ayush_assessments",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_ayush_assessments_status"), table_name="ayush_assessments")
    op.drop_index(op.f("ix_ayush_assessments_intake_session_id"), table_name="ayush_assessments")
    op.drop_table("ayush_assessments")
