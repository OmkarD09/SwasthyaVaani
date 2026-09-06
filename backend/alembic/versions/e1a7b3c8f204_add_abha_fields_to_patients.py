"""add abha fields to patients

Revision ID: e1a7b3c8f204
Revises: b4f08c2e6a91
Create Date: 2026-09-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e1a7b3c8f204"
down_revision: str | Sequence[str] | None = "b4f08c2e6a91"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("abha_address", sa.String(), nullable=True))
    op.create_index("ix_patients_abha_address", "patients", ["abha_address"], unique=False)
    op.add_column(
        "patients",
        sa.Column("abha_status", sa.String(), server_default="UNVERIFIED", nullable=False),
    )
    op.add_column(
        "patients",
        sa.Column("verification_timestamp", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "patients",
        sa.Column("consent_recorded", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("patients", "consent_recorded")
    op.drop_column("patients", "verification_timestamp")
    op.drop_column("patients", "abha_status")
    op.drop_index("ix_patients_abha_address", table_name="patients")
    op.drop_column("patients", "abha_address")
