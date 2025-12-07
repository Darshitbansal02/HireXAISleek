/**
 * Utility functions for test and assignment handling on the frontend
 * Ensures consistent timezone handling and date comparisons across all components
 */

/**
 * Check if a test/assignment has expired
 * @param expiresAt ISO 8601 datetime string or null
 * @returns boolean indicating if expired
 */
export function isTestExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/**
 * Check if a test/assignment has started
 * @param startsAt ISO 8601 datetime string or null
 * @returns boolean indicating if started
 */
export function hasTestStarted(startsAt: string | null): boolean {
  if (!startsAt) return true; // No start time means it's open
  return new Date(startsAt).getTime() <= Date.now();
}

/**
 * Check if a test/assignment is scheduled for a future time
 * @param scheduledAt ISO 8601 datetime string or null
 * @returns boolean indicating if scheduled for future
 */
export function isTestScheduledFuture(scheduledAt: string | null): boolean {
  if (!scheduledAt) return false;
  return new Date(scheduledAt).getTime() > Date.now();
}

/**
 * Get human-readable time remaining for a test
 * @param expiresAt ISO 8601 datetime string or null
 * @returns formatted string showing time remaining
 */
export function getTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return "N/A";
  
  const msRemaining = new Date(expiresAt).getTime() - Date.now();
  
  if (msRemaining < 0) {
    return "Expired";
  }
  
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.ceil(msRemaining / (1000 * 60));
  
  if (daysRemaining > 1) {
    return `${daysRemaining}d remaining`;
  } else if (hoursRemaining > 1) {
    return `${hoursRemaining}h remaining`;
  } else if (minutesRemaining > 0) {
    return `${minutesRemaining}m remaining`;
  } else {
    return "< 1m remaining";
  }
}

/**
 * Format an ISO 8601 datetime for display
 * @param dateString ISO 8601 datetime string
 * @param options Intl.DateTimeFormat options
 * @returns formatted date string
 */
export function formatDateTime(
  dateString: string | null,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", options);
}

/**
 * Get test status badge text
 * @param status test status (pending, started, completed, expired)
 * @param expiresAt expiration datetime
 * @param startsAt start datetime
 * @returns status badge text
 */
export function getTestStatusText(
  status: string,
  expiresAt?: string | null,
  startsAt?: string | null
): string {
  if (status === "completed") return "Completed";
  if (status === "started") return "In Progress";
  if (isTestExpired(expiresAt || null)) return "Expired";
  if (isTestScheduledFuture(startsAt || null)) return "Scheduled";
  return "Pending";
}

/**
 * Get test status badge color/variant
 * @param status test status
 * @param expiresAt expiration datetime
 * @param startsAt start datetime
 * @returns color/variant for badge
 */
export function getTestStatusVariant(
  status: string,
  expiresAt?: string | null,
  startsAt?: string | null
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "started") return "secondary";
  if (isTestExpired(expiresAt || null)) return "destructive";
  if (isTestScheduledFuture(startsAt || null)) return "outline";
  return "secondary";
}

/**
 * Calculate progress percentage for a test
 * @param startedAt when test was started
 * @param expiresAt when test expires
 * @returns progress percentage (0-100)
 */
export function getTestProgress(startedAt: string | null, expiresAt: string | null): number {
  if (!startedAt || !expiresAt) return 0;
  
  const start = new Date(startedAt).getTime();
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  
  const total = end - start;
  const elapsed = now - start;
  
  const percentage = Math.min(Math.max((elapsed / total) * 100, 0), 100);
  return Math.round(percentage);
}

/**
 * Proctoring event severity and descriptions
 */
export const PROCTOR_EVENT_SEVERITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export const PROCTOR_EVENT_INFO = {
  tab_switch: { severity: PROCTOR_EVENT_SEVERITY.MEDIUM, label: "Tab Switch Detected" },
  window_blur: { severity: PROCTOR_EVENT_SEVERITY.MEDIUM, label: "Window Lost Focus" },
  fullscreen_exit: { severity: PROCTOR_EVENT_SEVERITY.MEDIUM, label: "Fullscreen Exited" },
  copy_paste: { severity: PROCTOR_EVENT_SEVERITY.MEDIUM, label: "Copy/Paste Detected" },
  devtools_open: { severity: PROCTOR_EVENT_SEVERITY.MEDIUM, label: "Developer Tools Opened" },
  screen_monitor_changed: { severity: PROCTOR_EVENT_SEVERITY.LOW, label: "Monitor Changed" },
  screen_share_denied: { severity: PROCTOR_EVENT_SEVERITY.LOW, label: "Screen Share Denied" },
  face_missing: { severity: PROCTOR_EVENT_SEVERITY.HIGH, label: "Face Not Detected" },
  multiple_faces: { severity: PROCTOR_EVENT_SEVERITY.HIGH, label: "Multiple Faces Detected" },
  virtual_device: { severity: PROCTOR_EVENT_SEVERITY.HIGH, label: "Virtual Device Detected" },
  multiple_test_tabs_detected: { severity: PROCTOR_EVENT_SEVERITY.HIGH, label: "Multiple Test Tabs" },
  suspicious_activity: { severity: PROCTOR_EVENT_SEVERITY.HIGH, label: "Suspicious Activity" },
} as const;

/**
 * Get proctoring event info
 * @param eventType event type string
 * @returns event info or default
 */
export function getProctorEventInfo(
  eventType: string
): { severity: string; label: string } {
  return (
    PROCTOR_EVENT_INFO[eventType as keyof typeof PROCTOR_EVENT_INFO] || {
      severity: PROCTOR_EVENT_SEVERITY.MEDIUM,
      label: eventType,
    }
  );
}

/**
 * Count high severity proctoring events
 * @param logs array of proctoring logs
 * @returns count of high severity events
 */
export function countHighSeverityEvents(
  logs: Array<{ event_type: string }>
): number {
  return logs.filter(
    (log) =>
      getProctorEventInfo(log.event_type).severity ===
      PROCTOR_EVENT_SEVERITY.HIGH
  ).length;
}
