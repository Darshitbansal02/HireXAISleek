"""allow_interview_proctor_logs

Revision ID: d2104a35f636
Revises: 153dd14d9bde
Create Date: 2025-12-05 22:51:07.681564

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2104a35f636'
down_revision: Union[str, Sequence[str], None] = '153dd14d9bde'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Make assignment_id nullable
    op.alter_column('proctor_logs', 'assignment_id', nullable=True)
    # Add interview_room_id column
    op.add_column('proctor_logs', sa.Column('interview_room_id', sa.String(), nullable=True))
    # Add FK to interview_sessions
    op.create_foreign_key('fk_proctor_logs_interview_room_id', 'proctor_logs', 'interview_sessions', ['interview_room_id'], ['room_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_proctor_logs_interview_room_id', 'proctor_logs', type_='foreignkey')
    op.drop_column('proctor_logs', 'interview_room_id')
    op.alter_column('proctor_logs', 'assignment_id', nullable=False)
