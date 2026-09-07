"""add display_id to patients

Revision ID: g1b9d4e2a8c3
Revises: f3b8c1d9e2a4
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g1b9d4e2a8c3"
down_revision: str | Sequence[str] | None = "f3b8c1d9e2a4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "patients",
        sa.Column("display_id", sa.String(), nullable=True),
    )
    op.create_index("ix_patients_display_id", "patients", ["display_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_patients_display_id", table_name="patients")
    op.drop_column("patients", "display_id")
