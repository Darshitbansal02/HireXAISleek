from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from core.database import get_db
from core.auth import get_current_user
from models.test_system import TestAssignment, ProctorLog
from schemas.test_system import ProctorLogCreate
from core.config import settings
from core.proctor_constants import (
    VALID_EVENT_TYPES,
    EVENT_SEVERITY_MAP_DICT,
    ProctorEventSeverity,
    validate_event_type
)

from core.proctor_settings import ProctorSettings

router = APIRouter()

@router.get("/events-config")
async def get_proctoring_events_config():
    """Get proctoring event types and severity mapping for frontend consumption"""
    return {
        "events": VALID_EVENT_TYPES,
        "severity_map": EVENT_SEVERITY_MAP_DICT,
        "severity_levels": [e.value for e in ProctorEventSeverity],
        "settings": {
            "max_warnings": ProctorSettings.MAX_WARNINGS_SESSION,
            "max_violations": ProctorSettings.MAX_VIOLATIONS_TOTAL,
            "terminate_critical": ProctorSettings.TERMINATE_ON_CRITICAL
        }
    }

@router.get("/status")
async def get_proctoring_status(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get authoritative proctoring status including persistent warning count.
    Frontend uses this to restore state after refresh.
    """
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Calculate authoritative warning count (MEDIUM + HIGH severities)
    # LOW severity events do not count towards termination threshold
    warning_count = db.query(ProctorLog).filter(
        ProctorLog.assignment_id == assignment.id,
        ProctorLog.severity.in_([ProctorEventSeverity.MEDIUM.value, ProctorEventSeverity.HIGH.value])
    ).count()

    is_terminated = assignment.status == "terminated_fraud"

    return {
        "status": assignment.status,
        "terminated": is_terminated,
        "warning_count": warning_count,
        "max_warnings": ProctorSettings.MAX_VIOLATIONS_TOTAL
    }

@router.post("/log")
async def log_proctor_event(
    assignment_id: str,
    log_in: ProctorLogCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 1. Validate Event Type
    if not validate_event_type(log_in.event_type):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid event type: {log_in.event_type}"
        )
    
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    if assignment.status == "terminated_fraud":
        return {
            "status": "logged_ignored",
            "assignment_status": "terminated_fraud",
            "terminated": True,
            "warning_count": ProctorSettings.MAX_VIOLATIONS_TOTAL # Maxed out
        }

    # 2. Determine Severity
    # Use existing mapping or explicit overrides logic if needed
    # Here we strictly follow the map + dynamic rules
    severity_enum = EVENT_SEVERITY_MAP_DICT.get(log_in.event_type, ProctorEventSeverity.LOW.value)
    
    # Dynamic Severity Escalation/Adjustments
    if log_in.event_type == "screen_context_violation":
        # Check if baseline exists, else it's just noise/low
        if not (assignment.meta or {}).get('screen_baseline'):
             severity_enum = ProctorEventSeverity.LOW.value
        else:
             severity_enum = ProctorEventSeverity.CRITICAL.value

    if log_in.event_type == "screen_context_baseline_locked":
         # Logic side-effect: Save baseline
         current_meta = assignment.meta or {}
         current_meta['screen_baseline'] = log_in.payload
         assignment.meta = current_meta
         db.commit()

    # 3. Apply Enforcement Policy & Persist
    
    # Check for immediate termination conditions (CRITICAL)
    should_terminate = False
    termination_reason = ""

    if severity_enum == ProctorEventSeverity.CRITICAL.value:
        should_terminate = True
        termination_reason = f"Critical Violation: {log_in.event_type}"

    # Extension Policy: Check extension count
    if log_in.event_type == "extension_detected":
         severity_enum = ProctorEventSeverity.HIGH.value
         ext_count = db.query(ProctorLog).filter(
             ProctorLog.assignment_id == assignment.id, 
             ProctorLog.event_type == "extension_detected"
         ).count()
         if ext_count >= ProctorSettings.MAX_EXTENSION_WARNINGS:
             should_terminate = True
             termination_reason = "Prohibited Extension Detected (Repeated)"

    # SECURITY: Strip heavy blobs before saving
    safe_payload = {k: v for k, v in (log_in.payload or {}).items() 
                   if k not in ['image', 'snapshot', 'screenshot', 'base64', 'blob', 'buffer']}

    # Log the event
    new_log = ProctorLog(
        assignment_id=assignment.id,
        event_type=log_in.event_type,
        payload=safe_payload,
        severity=severity_enum
    )
    db.add(new_log)
    db.commit() # Commit to save log and ensure count is accurate

    # 4. Check Accumulated Warnings (MEDIUM + HIGH)
    # We query AFTER commit to include the current log
    current_warning_count = db.query(ProctorLog).filter(
        ProctorLog.assignment_id == assignment.id,
        ProctorLog.severity.in_([ProctorEventSeverity.MEDIUM.value, ProctorEventSeverity.HIGH.value])
    ).count()

    if not should_terminate and current_warning_count >= ProctorSettings.MAX_VIOLATIONS_TOTAL:
        should_terminate = True
        termination_reason = f"Excessive Warnings ({current_warning_count}/{ProctorSettings.MAX_VIOLATIONS_TOTAL})"

    # execute termination
    if should_terminate:
        print(f"[SECURITY] Terminating Assignment {assignment.id} Reason: {termination_reason}")
        assignment.status = "terminated_fraud"
        assignment.attempt_count = 3 # Exhaust attempts
        # We could log a "termination_event" here if we wanted
        db.commit()

    return {
        "status": "logged",
        "assignment_status": assignment.status,
        "terminated": assignment.status == "terminated_fraud",
        "warning_count": current_warning_count,
        "max_warnings": ProctorSettings.MAX_VIOLATIONS_TOTAL,
        "severity": severity_enum
    }


# ============================================================================
# Session Lock API (Server-side Single-Session Enforcement)
# ============================================================================

# In-memory session locks (in production, use Redis for multi-instance support)
_session_locks: dict = {}  # {assignment_id: {"user_id": str, "tab_id": str, "expires_at": datetime}}


@router.post("/session/lock")
async def acquire_session_lock(
    assignment_id: str,
    tab_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Acquire exclusive session lock for an assignment.
    Only one tab/browser can hold the lock at a time.
    """
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.utcnow()
    lock_timeout = ProctorSettings.SESSION_LOCK_TIMEOUT_SECONDS

    # Check for existing lock
    existing_lock = _session_locks.get(assignment_id)
    
    if existing_lock:
        # Lock exists - check if expired or same tab
        if existing_lock["expires_at"] > now and existing_lock["tab_id"] != tab_id:
            # Another active session exists
            # Log the conflict
            conflict_log = ProctorLog(
                assignment_id=assignment.id,
                event_type="session_lock_conflict",
                payload={
                    "existing_tab": existing_lock["tab_id"],
                    "new_tab": tab_id,
                    "message": "Multiple session attempt blocked"
                },
                severity="high"
            )
            db.add(conflict_log)
            db.commit()
            
            return {
                "success": False,
                "reason": "session_conflict",
                "message": "Test is already open in another browser/tab. Close it first.",
                "expires_in": (existing_lock["expires_at"] - now).seconds
            }
    
    # Grant the lock
    _session_locks[assignment_id] = {
        "user_id": str(current_user.id),
        "tab_id": tab_id,
        "expires_at": now + timedelta(seconds=lock_timeout)
    }
    
    # Log lock acquisition
    lock_log = ProctorLog(
        assignment_id=assignment.id,
        event_type="session_lock_acquired",
        payload={"tab_id": tab_id},
        severity="low"
    )
    db.add(lock_log)
    db.commit()
    
    return {
        "success": True,
        "tab_id": tab_id,
        "expires_in": lock_timeout,
        "message": "Session lock acquired"
    }


@router.post("/session/heartbeat")
async def session_heartbeat(
    assignment_id: str,
    tab_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Keep session lock alive. Must be called every ~10 seconds.
    """
    existing_lock = _session_locks.get(assignment_id)
    
    if not existing_lock:
        return {"success": False, "reason": "no_lock", "message": "No active session lock"}
    
    if existing_lock["tab_id"] != tab_id:
        return {"success": False, "reason": "wrong_tab", "message": "Lock belongs to another tab"}
    
    if existing_lock["user_id"] != str(current_user.id):
        return {"success": False, "reason": "wrong_user", "message": "Lock belongs to another user"}
    
    # Extend the lock
    lock_timeout = ProctorSettings.SESSION_LOCK_TIMEOUT_SECONDS
    _session_locks[assignment_id]["expires_at"] = datetime.utcnow() + timedelta(seconds=lock_timeout)
    
    return {
        "success": True,
        "expires_in": lock_timeout
    }


@router.delete("/session/lock")
async def release_session_lock(
    assignment_id: str,
    tab_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Release session lock when test ends or tab closes.
    """
    existing_lock = _session_locks.get(assignment_id)
    
    if not existing_lock:
        return {"success": True, "message": "No lock to release"}
    
    if existing_lock["tab_id"] != tab_id:
        return {"success": False, "reason": "wrong_tab", "message": "Cannot release another tab's lock"}
    
    # Remove the lock
    del _session_locks[assignment_id]
    
    return {"success": True, "message": "Session lock released"}


@router.get("/settings")
async def get_proctor_settings():
    """
    Get current proctor settings for frontend configuration.
    """
    return {
        "grace_period_seconds": ProctorSettings.GRACE_PERIOD_SECONDS,
        "liveness_check_interval_seconds": ProctorSettings.LIVENESS_CHECK_INTERVAL_SECONDS,
        "block_multi_monitor": ProctorSettings.BLOCK_MULTI_MONITOR,
        "block_vm": ProctorSettings.BLOCK_VM,
        "block_remote_desktop": ProctorSettings.BLOCK_REMOTE_DESKTOP,
        "session_lock_timeout_seconds": ProctorSettings.SESSION_LOCK_TIMEOUT_SECONDS,
        "max_warnings": ProctorSettings.MAX_VIOLATIONS_TOTAL,
        "terminate_on_critical": ProctorSettings.TERMINATE_ON_CRITICAL
    }

