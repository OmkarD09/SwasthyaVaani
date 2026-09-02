"""align doctor schema

Revision ID: a7c3e91d4b20
Revises: d8f2a6b91c04
Create Date: 2026-09-03
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a7c3e91d4b20"
down_revision: str | Sequence[str] | None = "d8f2a6b91c04"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("doctors", sa.Column("contact", sa.String(), nullable=True))
    op.add_column(
        "doctors",
        sa.Column("working_hours", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("doctors", "working_hours")
    op.drop_column("doctors", "contact")
