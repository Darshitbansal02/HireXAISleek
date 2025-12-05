from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from core.database import get_db
from core.auth import get_current_user
from models.test_system import TestAssignment, ProctorLog
from schemas.test_system import ProctorLogCreate
from core.config import settings

router = APIRouter()

@router.post("/log")
async def log_proctor_event(
    assignment_id: str,
    log_in: ProctorLogCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    log = ProctorLog(
        assignment_id=assignment.id,
        event_type=log_in.event_type,
        payload=log_in.payload
    )
    db.add(log)
    db.commit()
    return {"status": "logged"}

@router.post("/snapshot")
async def upload_snapshot(
    assignment_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    filename = f"snapshot_{assignment_id}_{datetime.utcnow().timestamp()}.jpg"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Log the snapshot event
    log = ProctorLog(
        assignment_id=assignment.id,
        event_type="webcam_snapshot",
        payload={"filename": filename}
    )
    db.add(log)
    db.commit()
    
    return {"status": "uploaded", "filename": filename}
