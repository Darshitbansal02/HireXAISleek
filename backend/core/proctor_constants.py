"""Proctoring event types and severity mappings for consistent validation across backend and frontend"""
from enum import Enum
from typing import Dict


class ProctorEventType(str, Enum):
    """Enum for all possible proctoring events"""
    TAB_SWITCH = "tab_switch"
    WINDOW_BLUR = "window_blur"
    FULLSCREEN_EXIT = "fullscreen_exit"
    COPY_PASTE = "copy_paste"
    DEVTOOLS_OPEN = "devtools_open"
    SCREEN_MONITOR_CHANGED = "screen_monitor_changed"
    SCREEN_SHARE_DENIED = "screen_share_denied"
    FACE_MISSING = "face_missing"
    MULTIPLE_FACES = "multiple_faces"
    VIRTUAL_DEVICE = "virtual_device"
    MULTIPLE_TEST_TABS = "multiple_test_tabs_detected"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    SCREEN_SHARE_STARTED = "screen_share_started"
    SCREEN_SHARE_STOPPED = "screen_share_stopped"
    CLIPBOARD_ATTEMPT = "clipboard_attempt"
    SCREENSHOT_ATTEMPT = "screenshot_attempt"
    FOCUS_LOST = "focus_lost"
    # New Events
    SCREEN_CONTEXT_VIOLATION = "screen_context_violation"
    FOCUS_LOST_WHILE_SCREEN_SHARING = "focus_lost_while_screen_sharing"
    CONFIRMED_WRONG_SCREEN_SHARED = "confirmed_wrong_screen_shared"
    SCREEN_SHARE_INTERRUPTED = "screen_share_interrupted"
    SCREEN_CONTEXT_BASELINE_LOCKED = "screen_context_baseline_locked"
    EXTENSION_DETECTED = "extension_detected"
    DEVTOOLS_ATTEMPT = "devtools_attempt"
    VIEWPORT_COMPROMISED = "viewport_compromised"
    SOURCE_VIEW_ATTEMPT = "source_view_attempt"


class ProctorEventSeverity(str, Enum):
    """Enum for event severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# Mapping of events to their severity levels
EVENT_SEVERITY_MAP: Dict[ProctorEventType, ProctorEventSeverity] = {
    ProctorEventType.MULTIPLE_FACES: ProctorEventSeverity.HIGH,
    ProctorEventType.FACE_MISSING: ProctorEventSeverity.HIGH,
    ProctorEventType.VIRTUAL_DEVICE: ProctorEventSeverity.HIGH,
    ProctorEventType.MULTIPLE_TEST_TABS: ProctorEventSeverity.HIGH,
    ProctorEventType.SUSPICIOUS_ACTIVITY: ProctorEventSeverity.HIGH,
    
    # New Mappings
    ProctorEventType.SCREEN_CONTEXT_VIOLATION: ProctorEventSeverity.CRITICAL,
    ProctorEventType.CONFIRMED_WRONG_SCREEN_SHARED: ProctorEventSeverity.CRITICAL,
    ProctorEventType.FOCUS_LOST_WHILE_SCREEN_SHARING: ProctorEventSeverity.HIGH,
    ProctorEventType.SCREEN_SHARE_INTERRUPTED: ProctorEventSeverity.HIGH,
    ProctorEventType.SCREEN_CONTEXT_BASELINE_LOCKED: ProctorEventSeverity.LOW,
    ProctorEventType.EXTENSION_DETECTED: ProctorEventSeverity.HIGH,

    ProctorEventType.TAB_SWITCH: ProctorEventSeverity.MEDIUM,
    ProctorEventType.WINDOW_BLUR: ProctorEventSeverity.MEDIUM,
    ProctorEventType.FULLSCREEN_EXIT: ProctorEventSeverity.MEDIUM,
    ProctorEventType.COPY_PASTE: ProctorEventSeverity.MEDIUM,
    ProctorEventType.DEVTOOLS_OPEN: ProctorEventSeverity.MEDIUM,
    ProctorEventType.SCREEN_MONITOR_CHANGED: ProctorEventSeverity.LOW,
    ProctorEventType.SCREEN_SHARE_DENIED: ProctorEventSeverity.LOW,
    ProctorEventType.SCREEN_SHARE_STARTED: ProctorEventSeverity.LOW,
    ProctorEventType.SCREEN_SHARE_STOPPED: ProctorEventSeverity.LOW,
    ProctorEventType.CLIPBOARD_ATTEMPT: ProctorEventSeverity.MEDIUM,
    ProctorEventType.SCREENSHOT_ATTEMPT: ProctorEventSeverity.HIGH,
    ProctorEventType.FOCUS_LOST: ProctorEventSeverity.MEDIUM,
    
    # New integrity checks
    ProctorEventType.VIEWPORT_COMPROMISED: ProctorEventSeverity.HIGH,
    ProctorEventType.DEVTOOLS_ATTEMPT: ProctorEventSeverity.HIGH,
    ProctorEventType.SOURCE_VIEW_ATTEMPT: ProctorEventSeverity.HIGH,
}


def get_event_severity(event_type: str) -> ProctorEventSeverity:
    """Get severity level for an event type, defaulting to LOW for unknown events"""
    try:
        event_enum = ProctorEventType(event_type)
        return EVENT_SEVERITY_MAP.get(event_enum, ProctorEventSeverity.LOW)
    except ValueError:
        return ProctorEventSeverity.LOW


def validate_event_type(event_type: str) -> bool:
    """Validate if an event type is valid"""
    try:
        ProctorEventType(event_type)
        return True
    except ValueError:
        return False


# Export all valid event types for frontend consumption
VALID_EVENT_TYPES = [e.value for e in ProctorEventType]

# Export severity map as dict with string keys for API responses
EVENT_SEVERITY_MAP_DICT = {k.value: v.value for k, v in EVENT_SEVERITY_MAP.items()}
