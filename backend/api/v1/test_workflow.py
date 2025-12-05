from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from core.database import get_db
from core.auth import get_current_user
from models.user import User
from models.test import Test, Question, TestAssignment, ProctorLog, TestResponse
from core.encryption import encrypt_text, decrypt_text
from pydantic import BaseModel
from datetime import datetime
import json
import os
import shutil
from core.config import settings

router = APIRouter()

# --- Schemas ---
class QuestionCreate(BaseModel):
    type: str
    question: str
    options: Optional[List[str]] = None
    answer_key: str # Correct answer or code output

class TestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    job_id: Optional[int] = None
    duration_minutes: int = 60
    passing_score: float = 70.0
    questions: List[QuestionCreate]

class AssignTestRequest(BaseModel):
    test_id: int
    candidate_ids: List[int]
    expires_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None

class SubmitResponseRequest(BaseModel):
    assignment_id: int
    answers: Dict[int, str] # Question ID -> Answer

# --- Endpoints ---

@router.post("/create", response_model=Dict[str, Any])
async def create_test(
    test_in: TestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only recruiters can create tests")
    
    # Create Test
    db_test = Test(
        title=test_in.title,
        description=test_in.description,
        job_id=test_in.job_id,
        recruiter_id=current_user.id,
        duration_minutes=test_in.duration_minutes,
        passing_score=test_in.passing_score,
        encrypted=True
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    
    # Create Encrypted Questions
    for q in test_in.questions:
        encrypted_q = encrypt_text(q.question)
        encrypted_opts = encrypt_text(json.dumps(q.options)) if q.options else None
        encrypted_ans = encrypt_text(q.answer_key)
        
        db_question = Question(
            test_id=db_test.id,
            type=q.type,
            encrypted_question=encrypted_q,
            encrypted_options=encrypted_opts,
            encrypted_answer_key=encrypted_ans
        )
        db.add(db_question)
    
    db.commit()
    return {"id": db_test.id, "message": "Test created successfully"}

@router.post("/assign")
async def assign_test(
    assign_in: AssignTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    count = 0
    for cand_id in assign_in.candidate_ids:
        # Check if already assigned
        exists = db.query(TestAssignment).filter(
            TestAssignment.test_id == assign_in.test_id,
            TestAssignment.candidate_id == cand_id
        ).first()
        
        if not exists:
            assignment = TestAssignment(
                test_id=assign_in.test_id,
                candidate_id=cand_id,
                expires_at=assign_in.expires_at,
                scheduled_at=assign_in.scheduled_at,
                status="pending"
            )
            db.add(assignment)
            count += 1
            
    db.commit()
    return {"message": f"Test assigned to {count} candidates"}

@router.get("/my-assignments")
async def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates have assignments")
        
    assignments = db.query(TestAssignment).filter(
        TestAssignment.candidate_id == current_user.id
    ).all()
    
    results = []
    for a in assignments:
        results.append({
            "id": a.id,
            "test_title": a.test.title,
            "duration": a.test.duration_minutes,
            "status": a.status,
            "expires_at": a.expires_at,
            "scheduled_at": a.scheduled_at
        })
    return results

@router.get("/my-tests")
async def get_my_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only recruiters can view their tests")
        
    tests = db.query(Test).filter(Test.recruiter_id == current_user.id).all()
    
    return [
        {
            "id": t.id,
            "title": t.title,
            "duration_minutes": t.duration_minutes,
            "created_at": t.created_at
        }
        for t in tests
    ]


@router.post("/start/{assignment_id}")
async def start_test_session(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = db.query(TestAssignment).filter(
        TestAssignment.id == assignment_id,
        TestAssignment.candidate_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check Scheduled Time
    if assignment.scheduled_at and datetime.utcnow() < assignment.scheduled_at:
        raise HTTPException(status_code=403, detail="Test has not started yet")
        
    if assignment.status == "submitted":
        raise HTTPException(status_code=400, detail="Test already submitted")
        
    if assignment.status == "pending":
        assignment.status = "in_progress"
        assignment.start_time = datetime.utcnow()
        db.commit()
        
    # Fetch and Decrypt Questions (WITHOUT Answer Key)
    questions_data = []
    for q in assignment.test.questions:
        q_text = decrypt_text(q.encrypted_question)
        q_opts = json.loads(decrypt_text(q.encrypted_options)) if q.encrypted_options else []
        
        questions_data.append({
            "id": q.id,
            "type": q.type,
            "text": q_text,
            "options": q_opts
        })
        
    return {
        "assignment_id": assignment.id,
        "duration": assignment.test.duration_minutes,
        "questions": questions_data,
        "scheduled_at": assignment.scheduled_at
    }

@router.post("/submit")
async def submit_test_responses(
    submit_in: SubmitResponseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = db.query(TestAssignment).filter(
        TestAssignment.id == submit_in.assignment_id,
        TestAssignment.candidate_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    score = 0
    total = 0
    
    for q_id, answer in submit_in.answers.items():
        question = db.query(Question).filter(Question.id == q_id).first()
        if not question:
            continue
            
        # Decrypt answer key
        correct_answer = decrypt_text(question.encrypted_answer_key)
        is_correct = (answer == correct_answer)
        
        if is_correct:
            score += 1
        total += 1
        
        # Save Response
        response = TestResponse(
            assignment_id=assignment.id,
            question_id=q_id,
            candidate_answer=answer,
            is_correct=is_correct
        )
        db.add(response)
        
    final_score = (score / total * 100) if total > 0 else 0
    
    assignment.status = "submitted"
    assignment.end_time = datetime.utcnow()
    assignment.score = final_score
    assignment.passed = final_score >= assignment.test.passing_score
    
    db.commit()
    return {"score": final_score, "passed": assignment.passed}

@router.post("/log-proctor")
async def log_proctor_event(
    event: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment_id = event.get("assignment_id")
    event_type = event.get("type")
    
    assignment = db.query(TestAssignment).filter(
        TestAssignment.id == assignment_id,
        TestAssignment.candidate_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    log = ProctorLog(
        assignment_id=assignment.id,
        event_type=event_type,
        details=event.get("details")
    )
    db.add(log)
    db.commit()
    return {"status": "logged"}

@router.get("/tests/{test_id}/results")
async def get_test_results(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    test = db.query(Test).filter(Test.id == test_id, Test.recruiter_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    assignments = db.query(TestAssignment).filter(TestAssignment.test_id == test_id).all()
    
    results = []
    for a in assignments:
        # Count warnings
        warning_count = db.query(ProctorLog).filter(ProctorLog.assignment_id == a.id).count()
        
        results.append({
            "assignment_id": a.id,
            "candidate_name": a.candidate.full_name,
            "candidate_email": a.candidate.email,
            "status": a.status,
            "score": a.score,
            "passed": a.passed,
            "start_time": a.start_time,
            "end_time": a.end_time,
            "warning_count": warning_count
        })
        
    # Sort by score descending
    results.sort(key=lambda x: x["score"] if x["score"] is not None else -1, reverse=True)
    return results

@router.get("/assignment/{assignment_id}/details")
async def get_assignment_details(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    # Verify recruiter owns the test
    if assignment.test.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    logs = db.query(ProctorLog).filter(ProctorLog.assignment_id == assignment.id).all()
    responses = db.query(TestResponse).filter(TestResponse.assignment_id == assignment.id).all()
    
    responses_data = []
    for r in responses:
        q_text = decrypt_text(r.question.encrypted_question)
        responses_data.append({
            "question": q_text,
            "candidate_answer": r.candidate_answer,
            "is_correct": r.is_correct
        })
        
    return {
        "candidate": {
            "name": assignment.candidate.full_name,
            "email": assignment.candidate.email
        },
        "test_title": assignment.test.title,
        "score": assignment.score,
        "logs": [{"type": l.event_type, "time": l.timestamp, "details": l.details} for l in logs],
        "responses": responses_data
    }

