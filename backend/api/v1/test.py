from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from core.database import get_db
from core.auth import get_current_user
from models.user import User
from models.test import Test, TestAttempt
from pydantic import BaseModel
from datetime import datetime

from core.config import settings

router = APIRouter()

class TestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    job_id: Optional[int] = None
    questions: List[dict]
    duration_minutes: int = 60
    passing_score: float = 70.0

class TestAttemptStart(BaseModel):
    test_id: int

class WarningLog(BaseModel):
    attempt_id: int
    type: str # tab_switch, fullscreen_exit

@router.post("/create", response_model=dict)
async def create_test(
    test: TestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only recruiters can create tests")
    
    db_test = Test(
        title=test.title,
        description=test.description,
        job_id=test.job_id,
        recruiter_id=current_user.id,
        questions=test.questions,
        duration_minutes=test.duration_minutes,
        passing_score=test.passing_score
    )
    
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return {"id": db_test.id, "message": "Test created successfully"}

@router.post("/start", response_model=dict)
async def start_attempt(
    data: TestAttemptStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if test exists
    test = db.query(Test).filter(Test.id == data.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    # Check if already attempted
    existing_attempt = db.query(TestAttempt).filter(
        TestAttempt.test_id == data.test_id,
        TestAttempt.candidate_id == current_user.id
    ).first()
    
    if existing_attempt:
        if existing_attempt.status == "in_progress":
            return {"attempt_id": existing_attempt.id, "message": "Resuming test"}
        else:
            raise HTTPException(status_code=400, detail="Test already completed")
            
    attempt = TestAttempt(
        test_id=data.test_id,
        candidate_id=current_user.id,
        status="in_progress"
    )
    
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return {"attempt_id": attempt.id, "questions": test.questions, "duration": test.duration_minutes}

@router.post("/log-warning")
async def log_warning(
    log: WarningLog,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempt = db.query(TestAttempt).filter(TestAttempt.id == log.attempt_id).first()
    if not attempt or attempt.candidate_id != current_user.id:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if log.type == "tab_switch":
        attempt.tab_switches += 1
    elif log.type == "fullscreen_exit":
        attempt.fullscreen_exits += 1
        
    attempt.warning_count += 1
    db.commit()
    return {"message": "Warning logged"}



@router.post("/submit/{attempt_id}")
async def submit_test(
    attempt_id: int,
    answers: dict, # Question ID -> Answer
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt or attempt.candidate_id != current_user.id:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    test = attempt.test
    score = 0
    total_questions = len(test.questions)
    
    # Simple scoring logic (assuming MCQ)
    for q in test.questions:
        q_id = str(q.get("id"))
        if q_id in answers and answers[q_id] == q.get("correct_answer"):
            score += 1
            
    final_score = (score / total_questions) * 100 if total_questions > 0 else 0
    
    attempt.score = final_score
    attempt.passed = final_score >= test.passing_score
    attempt.end_time = datetime.utcnow()
    attempt.status = "completed"
    
    db.commit()
    return {"score": final_score, "passed": attempt.passed}
