"""add grading_status

Revision ID: fcdc8278d54d
Revises: add_scheduled_at_column
Create Date: 2025-12-04 22:33:28.735934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fcdc8278d54d'
down_revision: Union[str, Sequence[str], None] = 'add_scheduled_at_column'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('submissions', sa.Column('grading_status', sa.String(), nullable=True, server_default='queued'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('submissions', 'grading_status')
