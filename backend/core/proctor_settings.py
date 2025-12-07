"""
Centralized Configuration for Exam Proctoring and Termination Logic.
Edit these values to control warning limits, termination thresholds, and strictness.
"""

class ProctorSettings:
    # --- Frontend Session Limits ---
    # How many warnings (tab switch, focus lost) allowed in a SINGLE session before auto-submit.
    # Default: 5
    MAX_WARNINGS_SESSION = 5

    # --- Backend Termination Thresholds ---
    # Total accumulated violations allowed across ALL sessions for an assignment.
    # Default: 10
    MAX_VIOLATIONS_TOTAL = 5

    # How many times we allow an extension to be detected before termination.
    # 0 = Zero tolerance (terminate immediately)
    # 1 = Warning first, terminate on second detection
    # Default: 1
    MAX_EXTENSION_WARNINGS = 1

    # --- Critical Security Triggers ---
    # If True, confirmed wrong screen sharing or context violation terminates immediately.
    # Default: True
    TERMINATE_ON_CRITICAL = True

    # --- Severity Overrides (Optional) ---
    # You can toggle specific checks effectively off by ignoring them or setting high limits
    # but actual event logic is in proctoring.py. These control the decision thresholds.
