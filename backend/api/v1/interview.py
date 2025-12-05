from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from core.database import get_db
from core.auth import get_current_user
from models.user import User
from models.interview import InterviewSession, InterviewStatus
from pydantic import BaseModel
from datetime import datetime
import uuid

router = APIRouter()

class InterviewCreate(BaseModel):
    candidate_id: int
    job_id: Optional[int] = None
    scheduled_at: datetime

class UserSchema(BaseModel):
    full_name: str
    email: str
    class Config:
        orm_mode = True

class JobSchema(BaseModel):
    title: str
    class Config:
        orm_mode = True

class InterviewResponse(BaseModel):
    id: int
    room_id: str
    recruiter_id: int
    candidate_id: int
    scheduled_at: datetime
    status: str
    candidate: Optional[UserSchema] = None
    recruiter: Optional[UserSchema] = None
    job: Optional[JobSchema] = None
    
    class Config:
        orm_mode = True

@router.post("/create", response_model=InterviewResponse)
async def create_interview(
    interview: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only recruiters can schedule interviews")
    
    room_id = str(uuid.uuid4())
    
    print(f"Creating interview for recruiter {current_user.id}, candidate {interview.candidate_id}")
    
    db_interview = InterviewSession(
        room_id=room_id,
        recruiter_id=current_user.id,
        candidate_id=interview.candidate_id,
        job_id=interview.job_id,
        scheduled_at=interview.scheduled_at,
        status=InterviewStatus.SCHEDULED
    )
    
    db.add(db_interview)
    db.commit()
    db.refresh(db_interview)
    print(f"Interview created with ID: {db_interview.id}")

    # --- NOTIFICATION ---
    from services.notification_service import notification_service
    notification_service.create_notification(
        db=db,
        user_id=interview.candidate_id,
        title="New Interview Scheduled",
        message=f"Interview confirmed for {interview.scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}. Please join 5 minutes early.",
        type="info",
        link_url=f"/candidate/interview/{room_id}"
    )
    # --------------------

    return db_interview

@router.get("/my-interviews", response_model=List[InterviewResponse])
async def get_my_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"Fetching interviews for user {current_user.id} ({current_user.role})")
    query = db.query(InterviewSession).options(
        joinedload(InterviewSession.candidate),
        joinedload(InterviewSession.recruiter),
        joinedload(InterviewSession.job)
    )
    
    if current_user.role == "recruiter":
        interviews = query.filter(InterviewSession.recruiter_id == current_user.id).all()
    else:
        interviews = query.filter(InterviewSession.candidate_id == current_user.id).all()
        
    print(f"Found {len(interviews)} interviews")
    return interviews

@router.get("/{room_id}", response_model=InterviewResponse)
async def get_interview_details(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interview = db.query(InterviewSession).options(
        joinedload(InterviewSession.candidate),
        joinedload(InterviewSession.recruiter),
        joinedload(InterviewSession.job)
    ).filter(InterviewSession.room_id == room_id).first()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    # Security check: only participants can view details
    if current_user.id not in [interview.recruiter_id, interview.candidate_id] and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this interview")
        
    return interview

@router.delete("/{room_id}")
def delete_interview(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    interview = db.query(InterviewSession).filter(InterviewSession.room_id == room_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    # Only recruiter or admin can delete
    if current_user.role not in ["recruiter", "admin"] and interview.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can end/delete the interview")
        
    db.delete(interview)
    db.commit()
    return {"success": True, "message": "Interview ended and deleted"}
