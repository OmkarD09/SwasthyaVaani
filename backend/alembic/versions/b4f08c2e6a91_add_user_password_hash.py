"""add user password hash

Revision ID: b4f08c2e6a91
Revises: a7c3e91d4b20
Create Date: 2026-09-03
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b4f08c2e6a91"
down_revision: str | Sequence[str] | None = "a7c3e91d4b20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_hash")
