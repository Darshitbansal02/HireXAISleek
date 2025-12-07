from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

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
