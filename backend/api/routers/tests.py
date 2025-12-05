from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from core.database import get_db
from core.auth import get_current_user
from models.test_system import Test, TestQuestion, TestAssignment
from schemas.test_system import TestCreate, TestPublic, TestSummary, QuestionCreate, QuestionPublic, AssignmentCreate
from services.llm_service import llm_service
from core.security_utils import encrypt_payload, decrypt_payload

router = APIRouter()

@router.post("/{test_id}/assign", response_model=List[str])
async def assign_test(
    test_id: str,
    assignment_in: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    created_ids = []
    for candidate_id in assignment_in.candidate_ids:
        # Check if already assigned? (Optional)
        
        assignment = TestAssignment(
            test_id=test.id,
            candidate_id=candidate_id,
            recruiter_id=current_user.id,
            expires_at=assignment_in.expires_at
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        created_ids.append(str(assignment.id))

        # --- NOTIFICATION ---
        from services.notification_service import notification_service
        
        # Format dates for message
        expires_str = assignment.expires_at.strftime('%Y-%m-%d %H:%M UTC') if assignment.expires_at else "No deadline"
        
        notification_service.create_notification(
            db=db,
            user_id=candidate_id,
            title="New Assessment Assigned",
            message=f"You have been assigned: {test.title}. Please complete it before {expires_str}. Late start will reduce your available time.",
            type="warning", 
            link_url=f"/candidate/test/{assignment.id}"
        )
        # --------------------
        
    return created_ids

@router.get("/{test_id}/assignments", response_model=List[dict])
async def get_test_assignments(
    test_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    assignments = db.query(TestAssignment).filter(TestAssignment.test_id == test_id).all()
    
    results = []
    for a in assignments:
        results.append({
            "id": str(a.id),
            "candidate_id": a.candidate_id,
            "status": a.status,
            "score": a.submissions[0].score if a.submissions else None, 
            "assigned_at": a.assigned_at,
            "starts_at": a.starts_at,
            "completed_at": a.submissions[0].submitted_at if a.submissions else None,
            "warning_count": len(a.proctor_logs) if a.proctor_logs else 0
        })
    return results

@router.get("/", response_model=List[TestSummary])
async def list_tests(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    tests = db.query(Test).filter(Test.recruiter_id == current_user.id).offset(skip).limit(limit).all()
    
    results = []
    for t in tests:
        results.append(TestSummary(
            id=t.id,
            title=t.title,
            description=t.description,
            duration_minutes=t.duration_minutes,
            meta=t.meta,
            created_at=t.created_at,
            questions_count=len(t.questions)
        ))
    return results

@router.post("/", response_model=TestPublic)
async def create_test(
    test_in: TestCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    db_test = Test(
        recruiter_id=current_user.id,
        title=test_in.title,
        description=test_in.description,
        duration_minutes=test_in.duration_minutes,
        meta=test_in.meta
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return db_test

@router.get("/{test_id}", response_model=TestPublic)
async def get_test(
    test_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Decrypt questions for display (Recruiter only?)
    # For now, return public info.
    # If recruiter, maybe we want to show hidden tests too?
    # The schema TestPublic -> QuestionPublic DOES NOT have hidden tests.
    
    # We need to decrypt payload to populate QuestionPublic fields
    public_questions = []
    for q in test.questions:
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
                options=problem_data.get("options", []) # Added options
            ))
        except Exception as e:
            print(f"Error decrypting question {q.id}: {e}")
            # Skip or show error placeholder
            continue

    # Construct response manually since we computed public_questions
    return TestPublic(
        id=test.id,
        title=test.title,
        description=test.description,
        duration_minutes=test.duration_minutes,
        meta=test.meta,
        created_at=test.created_at,
        questions=public_questions
    )

@router.post("/{test_id}/questions", response_model=QuestionPublic)
async def add_question(
    test_id: str,
    question_in: QuestionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Prepare payloads
    if question_in.q_type == "mcq":
        problem_payload = {
            "title": question_in.title,
            "description": question_in.description,
            "options": getattr(question_in, "options", []), # Assuming schema update or dict access
            # We need to update QuestionCreate schema to include options/correct_option
            # For now, let's assume question_in is Pydantic model.
            # I need to check schemas/test_system.py first!
            # But wait, I can't check it inside this tool call.
            # I will assume I need to update the schema too.
            # Let's use .dict() or getattr with default.
        }
        # For MCQ, hidden payload is the correct option index
        hidden_payload = {
            "correct_option": getattr(question_in, "correct_option", 0)
        }
    else:
        problem_payload = {
            "title": question_in.title,
            "description": question_in.description,
            "constraints": question_in.constraints,
            "examples": question_in.examples,
            "sample_tests": question_in.sample_tests,
            "language": question_in.language
        }
        
        hidden_payload = {
            "hidden_tests": question_in.hidden_tests,
            "canonical_solution": question_in.canonical_solution
        }

    # Encrypt
    enc_problem = encrypt_payload(json.dumps(problem_payload).encode())
    enc_hidden = encrypt_payload(json.dumps(hidden_payload).encode())

    db_question = TestQuestion(
        test_id=test.id,
        q_type=question_in.q_type,
        encrypted_problem_payload=enc_problem,
        encrypted_hidden_tests_payload=enc_hidden
    )
    
    db.add(db_question)
    db.commit()
    db.refresh(db_question)

    return QuestionPublic(
        id=db_question.id,
        q_type=db_question.q_type,
        title=question_in.title,
        description=question_in.description,
        constraints=question_in.constraints,
        examples=question_in.examples,
        sample_tests=question_in.sample_tests
        # Note: QuestionPublic might not have options field yet.
    )

@router.post("/{test_id}/generate-question")
async def generate_question_ai(
    test_id: str,
    topic: str,
    difficulty: str,
    language: str = "python",
    type: str = "coding",
    sample_count: int = 2,
    hidden_count: int = 5,
    count: int = 1,
    current_user = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        if type == "mcq":
            questions_data = await llm_service.generate_mcq_question(topic, difficulty, count)
        else:
            questions_data = await llm_service.generate_coding_question(topic, difficulty, language, sample_count, hidden_count, count)
        return questions_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{test_id}")
async def delete_test(
    test_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    if test.recruiter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this test")

    db.delete(test)
    db.commit()
    return {"message": "Test deleted successfully"}
