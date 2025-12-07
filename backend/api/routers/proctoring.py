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

router = APIRouter()

@router.get("/events-config")
async def get_proctoring_events_config():
    """Get proctoring event types and severity mapping for frontend consumption"""
    return {
        "events": VALID_EVENT_TYPES,
        "severity_map": EVENT_SEVERITY_MAP_DICT,
        "severity_levels": [e.value for e in ProctorEventSeverity]
    }

@router.post("/log")
async def log_proctor_event(
    assignment_id: str,
    log_in: ProctorLogCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Validate event type
    print(f"[DEBUG] Log Event: {log_in.event_type}, Payload: {log_in.payload}")
    if not validate_event_type(log_in.event_type):
        print(f"[ERROR] Invalid Event Type: {log_in.event_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event type: {log_in.event_type}. Valid types: {VALID_EVENT_TYPES}"
        )
    
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # 1. Baseline Implementation
    if log_in.event_type == "screen_context_baseline_locked":
        # Store baseline in meta
        current_meta = assignment.meta or {}
        current_meta['screen_baseline'] = log_in.payload
        assignment.meta = current_meta
        # assignment.status = "started" # Optional: ensure started
        db.commit()
    
    # 2. Validation & Severity
    severity = ProctorEventSeverity.LOW
    event_severity_key = EVENT_SEVERITY_MAP_DICT.get(log_in.event_type, "low")
    
    # Check baseline presence for context violations
    if log_in.event_type == "screen_context_violation":
        baseline = (assignment.meta or {}).get('screen_baseline')
        if not baseline:
             print("[WARN] Context violation reported without baseline. Ignoring or logging as LOW.")
             # We might accept it to be safe, but it's suspicious.
        else:
            severity = ProctorEventSeverity.CRITICAL

    if log_in.event_type == "extension_detected":
        severity = ProctorEventSeverity.HIGH

    # 3. Escalation Logic
    # Count warnings
    total_logs = db.query(ProctorLog).filter(ProctorLog.assignment_id == assignment.id).count()
    
    # Fraud Termination Triggers
    should_terminate = False
    termination_reason = ""

    if log_in.event_type in ["confirmed_wrong_screen_shared", "screen_context_violation"] and severity == "critical":
        # Immediate termination for confirmed screen swaps
        should_terminate = True
        termination_reason = "Screen Context Violation (Confirmed Swap)"
    
    elif log_in.event_type == "extension_detected":
         # Check if we already have extension logs
         ext_count = db.query(ProctorLog).filter(
             ProctorLog.assignment_id == assignment.id, 
             ProctorLog.event_type == "extension_detected"
         ).count()
         if ext_count >= 1: # Terminate on 2nd detection (0 existing + 1 current = 1? No 1st time warning, 2nd time die)
              should_terminate = True
              termination_reason = "Prohibited Extension Detected (Repeated)"
    
    elif total_logs >= 10:
        should_terminate = True
        termination_reason = "Excessive Warning Threshold Reached (>10)"

    if should_terminate:
        print(f"[SECURITY] Terminating Assignment {assignment.id} due to: {termination_reason}")
        assignment.status = "terminated_fraud"
        assignment.attempt_count = 3 # Max out attempts
        # Optionally log a special termination event
        # but the logic below logs the current event causing it

    # SECURITY: Strip image data
    safe_payload = {k: v for k, v in (log_in.payload or {}).items() 
                   if k not in ['image', 'snapshot', 'screenshot', 'base64', 'blob', 'buffer', 'jpeg', 'png']}
    
    log = ProctorLog(
        assignment_id=assignment.id,
        event_type=log_in.event_type,
        payload=safe_payload,
        severity=severity.value if isinstance(severity, ProctorEventSeverity) else severity
    )
    db.add(log)
    db.commit()
    
    # Return status so frontend knows if it died
    return {
        "status": "logged", 
        "assignment_status": assignment.status,
        "terminated": assignment.status == "terminated_fraud"
    }
