"""add review lifecycle to intake sessions

Revision ID: f3b8c1d9e2a4
Revises: e1a7b3c8f204
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f3b8c1d9e2a4"
down_revision: str | Sequence[str] | None = "e1a7b3c8f204"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "intake_sessions",
        sa.Column("review_status", sa.String(), server_default="PENDING_REVIEW", nullable=False),
    )
    op.create_index("ix_intake_sessions_review_status", "intake_sessions", ["review_status"], unique=False)
    op.add_column(
        "intake_sessions",
        sa.Column("reviewed_by", sa.String(), sa.ForeignKey("doctors.id"), nullable=True),
    )
    op.add_column(
        "intake_sessions",
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("intake_sessions", "reviewed_at")
    op.drop_column("intake_sessions", "reviewed_by")
    op.drop_index("ix_intake_sessions_review_status", table_name="intake_sessions")
    op.drop_column("intake_sessions", "review_status")
