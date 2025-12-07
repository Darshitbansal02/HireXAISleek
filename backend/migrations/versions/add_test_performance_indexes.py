"""Add performance indexes to test system tables

Revision ID: add_test_performance_indexes
Revises: fcdc8278d54d_add_grading_status
Create Date: 2025-12-06 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_test_performance_indexes'
down_revision = 'fcdc8278d54d_add_grading_status'
branch_labels = None
depends_on = None


def upgrade():
    """Create indexes for frequently queried columns in test system tables"""
    
    # TestAssignment indexes
    op.create_index('idx_assignments_candidate_id', 'test_assignments', ['candidate_id'])
    op.create_index('idx_assignments_status', 'test_assignments', ['status'])
    op.create_index('idx_assignments_created_at', 'test_assignments', ['created_at'])
    op.create_index('idx_assignments_expires_at', 'test_assignments', ['expires_at'])
    
    # Submission indexes
    op.create_index('idx_submissions_assignment_id', 'submissions', ['assignment_id'])
    op.create_index('idx_submissions_grading_status', 'submissions', ['grading_status'])
    op.create_index('idx_submissions_score', 'submissions', ['score'])
    
    # ProctorLog indexes
    op.create_index('idx_proctor_logs_assignment_id', 'proctor_logs', ['assignment_id'])
    op.create_index('idx_proctor_logs_timestamp', 'proctor_logs', ['timestamp'])
    op.create_index('idx_proctor_logs_event_type', 'proctor_logs', ['event_type'])
    
    # TestQuestion indexes
    op.create_index('idx_test_questions_test_id', 'test_questions', ['test_id'])
    
    # Test indexes
    op.create_index('idx_tests_recruiter_id', 'tests', ['recruiter_id'])


def downgrade():
    """Drop all performance indexes"""
    
    # Drop TestAssignment indexes
    op.drop_index('idx_assignments_candidate_id', table_name='test_assignments')
    op.drop_index('idx_assignments_status', table_name='test_assignments')
    op.drop_index('idx_assignments_created_at', table_name='test_assignments')
    op.drop_index('idx_assignments_expires_at', table_name='test_assignments')
    
    # Drop Submission indexes
    op.drop_index('idx_submissions_assignment_id', table_name='submissions')
    op.drop_index('idx_submissions_grading_status', table_name='submissions')
    op.drop_index('idx_submissions_score', table_name='submissions')
    
    # Drop ProctorLog indexes
    op.drop_index('idx_proctor_logs_assignment_id', table_name='proctor_logs')
    op.drop_index('idx_proctor_logs_timestamp', table_name='proctor_logs')
    op.drop_index('idx_proctor_logs_event_type', table_name='proctor_logs')
    
    # Drop TestQuestion indexes
    op.drop_index('idx_test_questions_test_id', table_name='test_questions')
    
    # Drop Test indexes
    op.drop_index('idx_tests_recruiter_id', table_name='tests')
