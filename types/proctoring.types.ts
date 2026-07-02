// Proctoring types - Synced with backend/core/proctor_constants.py

export type ProctorEventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ProctorEventType =
    // Focus/Tab events
    | "tab_switch"
    | "focus_lost"
    | "focus_regained"
    | "visibility_hidden"
    | "visibility_visible"
    // Face detection
    | "face_missing"
    | "face_detected"
    | "multiple_faces"
    // Screen sharing
    | "screen_share_started"
    | "screen_share_stopped"
    | "screen_context_baseline_locked"
    | "screen_context_violation"
    | "screen_share_denied"
    // Extensions/Security
    | "extension_detected"
    | "ai_api_detected"
    // Clipboard
    | "clipboard_paste_detected"
    // DevTools
    | "devtools_opened"
    | "devtools_closed"
    // Fullscreen
    | "fullscreen_exited"
    | "fullscreen_entered"
    // Single tab
    | "multiple_test_tabs_detected"
    // Keystroke
    | "typing_anomaly_detected"
    // Test lifecycle
    | "test_started"
    | "test_completed"
    | "test_terminated";

export interface ProctorLog {
    id: string;
    assignment_id: string;
    event_type: ProctorEventType;
    severity: ProctorEventSeverity;
    payload?: Record<string, unknown>;
    timestamp: string;
}

export interface ProctorLogPayload {
    event_type: ProctorEventType;
    payload?: Record<string, unknown>;
}

export interface ProctorStatus {
    status: string;
    terminated: boolean;
    warning_count: number;
    max_warnings: number;
}

export interface ProctorEventsConfig {
    events: ProctorEventType[];
    severity_map: Record<ProctorEventType, ProctorEventSeverity>;
    severity_levels: ProctorEventSeverity[];
    settings: {
        max_warnings: number;
        max_violations: number;
        terminate_critical: boolean;
    };
}
