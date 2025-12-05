"""add scheduled_at to test_assignments

Revision ID: add_scheduled_at_column
Revises: 84705add5a2d
Create Date: 2025-12-04 21:16:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_scheduled_at_column'
down_revision = '84705add5a2d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('test_assignments', sa.Column('scheduled_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('test_assignments', 'scheduled_at')
