"""Add severity column to proctor_logs table.

Revision ID: 007_add_proctor_severity
Revises: 006_add_proctor_logs
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_add_proctor_severity'
down_revision = '006_add_proctor_logs'
branch_labels = None
depends_on = None


# Map event types to severity levels
EVENT_SEVERITY_MAP = {
    # HIGH severity
    'suspicious_activity': 'HIGH',
    'face_not_detected': 'HIGH',
    'multiple_faces_detected': 'HIGH',
    'face_obscured': 'HIGH',
    'person_left_frame': 'HIGH',
    'tab_switch_detected': 'HIGH',
    'alt_tab_detected': 'HIGH',
    'multiple_tabs_detected': 'HIGH',
    'window_lost_focus': 'HIGH',
    'fullscreen_exited': 'HIGH',
    'screen_share_stopped': 'HIGH',
    'microphone_disabled': 'HIGH',
    'camera_disabled': 'HIGH',
    'clipboard_access_denied': 'HIGH',
    'invalid_test_environment': 'HIGH',

    # MEDIUM severity
    'face_detection_interval_skipped': 'MEDIUM',
    'low_lighting_detected': 'MEDIUM',
    'background_changed': 'MEDIUM',
    'device_orientation_changed': 'MEDIUM',
    'screen_resolution_changed': 'MEDIUM',
    'network_status_changed': 'MEDIUM',
    'browser_console_accessed': 'MEDIUM',
    'inspect_element_attempted': 'MEDIUM',

    # LOW severity
    'face_detection_started': 'LOW',
    'face_detection_stopped': 'LOW',
    'screen_share_requested': 'LOW',
    'screen_share_started': 'LOW',
    'screen_monitor_changed': 'LOW',
    'test_window_opened': 'LOW',
    'test_window_closed': 'LOW',
}


def upgrade():
    """Add severity column to proctor_logs and populate from event_type."""
    # Add new column (nullable initially)
    op.add_column(
        'proctor_logs',
        sa.Column('severity', sa.String(10), nullable=True)
    )

    # Populate severity based on event_type
    # Using raw SQL for batch update
    connection = op.get_bind()
    
    for event_type, severity in EVENT_SEVERITY_MAP.items():
        connection.execute(
            sa.text(
                "UPDATE proctor_logs SET severity = :severity WHERE event_type = :event_type"
            ),
            {"severity": severity, "event_type": event_type}
        )
    
    # Default to 'LOW' for any unmapped event types
    connection.execute(
        sa.text(
            "UPDATE proctor_logs SET severity = 'LOW' WHERE severity IS NULL"
        )
    )
    
    # Make column non-nullable
    op.alter_column(
        'proctor_logs',
        'severity',
        existing_type=sa.String(10),
        nullable=False
    )

    # Add index on severity for faster filtering
    op.create_index(
        'ix_proctor_logs_severity',
        'proctor_logs',
        ['severity']
    )


def downgrade():
    """Remove severity column from proctor_logs."""
    op.drop_index('ix_proctor_logs_severity', table_name='proctor_logs')
    op.drop_column('proctor_logs', 'severity')
