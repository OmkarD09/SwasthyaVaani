"""merge abha and ayush heads

Revision ID: 43ab6177c2da
Revises: e1a7b3c8f204, e5f1b2c3d4e5
Create Date: 2026-09-06 14:39:14.308872

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '43ab6177c2da'
down_revision: Union[str, Sequence[str], None] = ('e1a7b3c8f204', 'e5f1b2c3d4e5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
