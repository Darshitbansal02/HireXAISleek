"""add_test_system

Revision ID: 84705add5a2d
Revises: 704dc4252b16
Create Date: 2025-12-03 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '84705add5a2d'
down_revision: Union[str, Sequence[str], None] = '704dc4252b16'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop legacy/existing tables if exists to ensure clean state
    op.execute('DROP TABLE IF EXISTS proctor_logs CASCADE')
    op.execute('DROP TABLE IF EXISTS submissions CASCADE')
    op.execute('DROP TABLE IF EXISTS test_assignments CASCADE')
    op.execute('DROP TABLE IF EXISTS test_questions CASCADE')
    op.execute('DROP TABLE IF EXISTS tests CASCADE')

    # tests table
    op.create_table(
        'tests',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('recruiter_id', sa.Integer(), nullable=False), # Integer to match User.id
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # test_questions table
    op.create_table(
        'test_questions',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('test_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('q_type', sa.String(), nullable=True),
        sa.Column('encrypted_problem_payload', sa.LargeBinary(), nullable=False),
        sa.Column('encrypted_hidden_tests_payload', sa.LargeBinary(), nullable=False),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # test_assignments table
    op.create_table(
        'test_assignments',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('test_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('candidate_id', sa.Integer(), nullable=False), # Integer to match User.id
        sa.Column('recruiter_id', sa.Integer(), nullable=True), # Integer to match User.id
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('webcam_snapshots', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # submissions table
    op.create_table(
        'submissions',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('assignment_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('question_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('language', sa.String(), nullable=False),
        sa.Column('code', sa.Text(), nullable=False),
        sa.Column('execution_summary', sa.JSON(), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['assignment_id'], ['test_assignments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['test_questions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # proctor_logs table
    op.create_table(
        'proctor_logs',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('assignment_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['assignment_id'], ['test_assignments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Indexes
    op.create_index('idx_assignments_candidate_id', 'test_assignments', ['candidate_id'])
    op.create_index('idx_submissions_assignment_id', 'submissions', ['assignment_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_submissions_assignment_id', table_name='submissions')
    op.drop_index('idx_assignments_candidate_id', table_name='test_assignments')
    op.drop_table('proctor_logs')
    op.drop_table('submissions')
    op.drop_table('test_assignments')
    op.drop_table('test_questions')
    op.drop_table('tests')
