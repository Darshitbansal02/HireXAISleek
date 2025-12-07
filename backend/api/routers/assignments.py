from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import json

from core.database import get_db
from core.auth import get_current_user
from models.test_system import Test, TestAssignment, Submission, TestQuestion, ProctorLog
from schemas.test_system import AssignmentCreate, AssignmentPublic, SubmissionCreate, SubmissionResult, TestPublic, QuestionPublic
from services.judge_service import judge_service
from core.security_utils import decrypt_payload
from pydantic import BaseModel
from workers.grading import grade_submission

router = APIRouter()
recruiter_router = APIRouter()

class RunTestRequest(BaseModel):
    question_id: str
    code: str
    language: str

@router.get("/", response_model=List[AssignmentPublic])
async def list_assignments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Use eager loading to prevent N+1 queries
    assignments = db.query(TestAssignment)\
        .options(joinedload(TestAssignment.test).joinedload(Test.questions))\
        .filter(TestAssignment.candidate_id == current_user.id)\
        .all()
    
    results = []
    for a in assignments:
        test_public = TestPublic(
            id=a.test.id,
            title=a.test.title,
            description=a.test.description,
            duration_minutes=a.test.duration_minutes,
            created_at=a.test.created_at,
            questions=[] 
        )
        
        # Calculate score dynamically
        current_score = sum([s.score for s in a.submissions]) if a.submissions else 0.0

        results.append(AssignmentPublic(
            id=a.id,
            test=test_public,
            status=a.status,
            starts_at=a.starts_at,
            expires_at=a.expires_at,
            scheduled_at=a.scheduled_at,
            candidate_id=a.candidate_id,
            score=current_score,
            attempt_count=a.attempt_count
        ))
    return results

@router.get("/{assignment_id}", response_model=AssignmentPublic)
async def get_assignment_detail(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Use eager loading to prevent N+1 queries
    assignment = db.query(TestAssignment)\
        .options(
            joinedload(TestAssignment.test).joinedload(Test.questions),
            joinedload(TestAssignment.submissions)
        )\
        .filter(TestAssignment.id == assignment_id)\
        .first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this assignment")

    # Decrypt questions (Public payload ONLY)
    public_questions = []
    for q in assignment.test.questions:
        try:
            decrypted_problem = decrypt_payload(q.encrypted_problem_payload)
            problem_data = json.loads(decrypted_problem.decode())
            
            public_questions.append(QuestionPublic(
                id=q.id,
                q_type=q.q_type,
                title=problem_data.get("title", ""),
                description=problem_data.get("description", ""),
                constraints=problem_data.get("constraints", ""),
                examples=problem_data.get("examples", []),
                sample_tests=problem_data.get("sample_tests", []),
                options=problem_data.get("options", []) 
            ))
        except Exception as e:
            print(f"Error decrypting question {q.id}: {e}")

    test_public = TestPublic(
        id=assignment.test.id,
        title=assignment.test.title,
        description=assignment.test.description,
        duration_minutes=assignment.test.duration_minutes,
        created_at=assignment.test.created_at,
        questions=public_questions
    )

    # Calculate score dynamically
    current_score = sum([s.score for s in assignment.submissions]) if assignment.submissions else 0.0

    return AssignmentPublic(
        id=assignment.id,
        test=test_public,
        status=assignment.status,
        starts_at=assignment.starts_at,
        expires_at=assignment.expires_at,
        scheduled_at=assignment.scheduled_at,
        candidate_id=assignment.candidate_id,
        score=current_score,
        attempt_count=assignment.attempt_count
    )

@router.post("/{assignment_id}/start")
async def start_test(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # 3. Check Schedule (Robust Timezone Handling)
    if assignment.scheduled_at:
        now_utc = datetime.now(timezone.utc)
        scheduled_utc = assignment.scheduled_at
        
        # Ensure scheduled_utc is timezone-aware
        if scheduled_utc.tzinfo is None:
            scheduled_utc = scheduled_utc.replace(tzinfo=timezone.utc)
            
        if now_utc < scheduled_utc:
            wait_time = (scheduled_utc - now_utc).total_seconds()
            minutes = int(wait_time // 60) + 1 # Round up
            raise HTTPException(
                status_code=403,
                detail=f"Test is scheduled for {scheduled_utc.strftime('%Y-%m-%d %H:%M UTC')}. Please wait {minutes} minutes."
            )

    # 4. Check Attempts (Max 3)
    if assignment.attempt_count >= 3:
        raise HTTPException(
            status_code=403, 
            detail="Maximum attempts reached (3). You cannot restart this test."
        )

    # 5. Check Duration / Expiry
    if assignment.status == "completed":
         raise HTTPException(status_code=400, detail="Test already submitted")
         
    if assignment.expires_at and datetime.now(timezone.utc) > assignment.expires_at:
        assignment.status = "expired"
        db.commit()
        raise HTTPException(status_code=403, detail="Test time has expired")

    # Start Test Logic
    if assignment.status == "pending":
        assignment.status = "started"
        assignment.starts_at = datetime.now(timezone.utc)
        # Calculate strict expires_at based on duration
        duration_minutes = assignment.test.duration_minutes or 60
        assignment.expires_at = assignment.starts_at + timedelta(minutes=duration_minutes)
    
    # Increment attempt count
    assignment.attempt_count += 1
    db.commit()
    return {"status": "started", "starts_at": assignment.starts_at}

@router.post("/{assignment_id}/run")
async def run_test(
    assignment_id: str,
    run_req: RunTestRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    question = db.query(TestQuestion).filter(TestQuestion.id == run_req.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Decrypt problem payload to get sample tests
    try:
        decrypted_problem = decrypt_payload(question.encrypted_problem_payload)
        problem_data = json.loads(decrypted_problem.decode())
        sample_tests = problem_data.get("sample_tests", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to decrypt question data")

    if not sample_tests:
        return {"results": [], "message": "No sample tests available"}

    results = []
    for test in sample_tests:
        result = await judge_service.execute_code(
            language=run_req.language,
            code=run_req.code,
            stdin=test.get("input", ""),
            expected_output=test.get("output", "")
        )
        
        # Add input/expected to result for UI display
        result["input"] = test.get("input", "")
        result["expected"] = test.get("output", "")
        result["actual"] = result.get("stdout", "").strip()
        
        results.append(result)

    return {"results": results}

@router.patch("/{assignment_id}/draft")
async def save_draft(
    assignment_id: str,
    submission_in: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Save code as draft without grading.
    """
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Check if submission exists for this question
    submission = db.query(Submission).filter(
        Submission.assignment_id == assignment.id,
        Submission.question_id == submission_in.question_id
    ).first()
    
    if submission:
        submission.code = submission_in.code
        submission.language = submission_in.language
        # Don't change status or score
    else:
        submission = Submission(
            assignment_id=assignment.id,
            question_id=submission_in.question_id,
            language=submission_in.language,
            code=submission_in.code,
            grading_status="draft",
            score=0
        )
        db.add(submission)
    
    db.commit()
    return {"status": "draft_saved"}

@router.post("/{assignment_id}/finish")
async def finish_test(
    assignment_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    assignment.status = "completed"
    # assignment.completed_at = datetime.utcnow() 
    
    # Queue grading for all submissions
    submissions = db.query(Submission).filter(Submission.assignment_id == assignment.id).all()
    for sub in submissions:
        if sub.grading_status == "draft" or sub.grading_status == "queued":
             sub.grading_status = "queued"
             background_tasks.add_task(grade_submission, str(sub.id))
    
    db.commit()
    return {"status": "completed"}

@router.post("/{assignment_id}/submit", response_model=SubmissionResult)
async def submit_code(
    assignment_id: str,
    submission_in: SubmissionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if str(assignment.candidate_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get question
    question = db.query(TestQuestion).filter(TestQuestion.id == submission_in.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Check if submission exists
    submission = db.query(Submission).filter(
        Submission.assignment_id == assignment.id,
        Submission.question_id == submission_in.question_id
    ).first()

    if submission:
        submission.code = submission_in.code
        submission.language = submission_in.language
        submission.grading_status = "queued"
        submission.execution_summary = None # Reset summary
    else:
        submission = Submission(
            assignment_id=assignment.id,
            question_id=question.id,
            language=submission_in.language,
            code=submission_in.code,
            grading_status="queued",
            score=0
        )
        db.add(submission)
    
    db.commit()
    db.refresh(submission)
    
    # Queue Grading Task
    background_tasks.add_task(grade_submission, str(submission.id))
    
    return SubmissionResult(
        id=submission.id,
        status="completed", # Legacy status field
        grading_status="queued",
        execution_summary=None,
        score=0
    )

@recruiter_router.get("/{assignment_id}")
async def get_assignment_detail_recruiter(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    assignment = db.query(TestAssignment).filter(TestAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if assignment.test.recruiter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    questions_data = []
    for q in assignment.test.questions:
        try:
            decrypted_problem = decrypt_payload(q.encrypted_problem_payload)
            problem_data = json.loads(decrypted_problem.decode())
            
            decrypted_hidden = decrypt_payload(q.encrypted_hidden_tests_payload)
            hidden_data = json.loads(decrypted_hidden.decode())

            questions_data.append({
                "id": q.id,
                "title": problem_data.get("title", ""),
                "description": problem_data.get("description", ""),
                "q_type": q.q_type,
                "options": problem_data.get("options", []),
                "correct_option": hidden_data.get("correct_option"),
                "hidden_tests": hidden_data.get("hidden_tests", [])
            })
        except Exception as e:
            print(f"Error decrypting question {q.id}: {e}")

    submissions = db.query(Submission).filter(Submission.assignment_id == assignment.id).all()
    
    # Calculate Score Dynamically
    latest_scores = {}
    completed_at = None
    
    for s in submissions:
        latest_scores[s.question_id] = s.score
        if not completed_at or s.submitted_at > completed_at:
            completed_at = s.submitted_at
        
    total_score = sum(latest_scores.values())
    max_score = len(assignment.test.questions) * 100
    calculated_score = (total_score / max_score) * 100 if max_score > 0 else 0
    
    # Get Proctor Logs explicitly
    proctor_logs = db.query(ProctorLog).filter(ProctorLog.assignment_id == assignment.id).order_by(ProctorLog.timestamp.desc()).all()
    
    return {
        "assignment": {
            "id": assignment.id,
            "candidate_id": assignment.candidate_id,
            "status": assignment.status,
            "score": calculated_score,
            "warning_count": len(proctor_logs),
            "started_at": assignment.starts_at,
            "completed_at": completed_at if assignment.status == "completed" else None,
        },
        "test": {
            "title": assignment.test.title,
            "questions": questions_data
        },
        "submissions": [
            {
                "question_id": s.question_id,
                "code": s.code,
                "language": s.language,
                "score": s.score,
                "execution_summary": s.execution_summary
            } for s in submissions
        ],
        "proctor_logs": proctor_logs
    }
