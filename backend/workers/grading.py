import asyncio
import json
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.test_system import Submission, TestAssignment, TestQuestion
from services.judge_service import judge_service
from core.security_utils import decrypt_payload
from core.logging import get_logger

logger = get_logger()

async def grade_submission(submission_id: str):
    """
    Background task to grade a submission against hidden test cases.
    """
    db: Session = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            logger.error(f"Submission {submission_id} not found for grading")
            return

        submission.grading_status = "processing"
        db.commit()

        # Fetch Question and Hidden Tests
        question = db.query(TestQuestion).filter(TestQuestion.id == submission.question_id).first()
        if not question:
            logger.error(f"Question {submission.question_id} not found")
            submission.grading_status = "error"
            db.commit()
            return

        try:
            decrypted_hidden = decrypt_payload(question.encrypted_hidden_tests_payload)
            hidden_data = json.loads(decrypted_hidden.decode())
            
            # Also decrypt problem payload for sample tests
            decrypted_problem = decrypt_payload(question.encrypted_problem_payload)
            problem_data = json.loads(decrypted_problem.decode())
        except Exception as e:
            logger.error(f"Failed to decrypt payloads: {e}")
            submission.grading_status = "error"
            db.commit()
            return

        # Grading Logic
        execution_details = []
        passed_count = 0
        total_tests = 0

        if question.q_type == "mcq":
            correct_option = hidden_data.get("correct_option", 0)
            try:
                selected_option = int(submission.code)
                is_correct = selected_option == correct_option
                passed_count = 1 if is_correct else 0
                total_tests = 1
                execution_details = [{"verdict": "passed" if is_correct else "failed", "selected": selected_option, "correct": correct_option, "type": "mcq"}]
            except ValueError:
                passed_count = 0
                total_tests = 1
                execution_details = [{"verdict": "error", "message": "Invalid MCQ submission format", "type": "mcq"}]
        else:
            # Coding Question
            
            # 1. Run Sample Tests (Visible)
            sample_tests = problem_data.get("sample_tests", [])
            for test in sample_tests:
                result = await judge_service.execute_code(
                    language=submission.language,
                    code=submission.code,
                    stdin=test["input"],
                    expected_output=test["output"]
                )
                result["type"] = "sample"
                execution_details.append(result)

            # 2. Run Hidden Tests (Grading)
            hidden_tests = hidden_data.get("hidden_tests", [])
            total_tests = len(hidden_tests)
            
            for test in hidden_tests:
                result = await judge_service.execute_code(
                    language=submission.language,
                    code=submission.code,
                    stdin=test["input"],
                    expected_output=test["output"]
                )
                result["type"] = "hidden"
                execution_details.append(result)
                if result["verdict"] == "passed":
                    passed_count += 1
        
        score = (passed_count / total_tests) * 100 if total_tests > 0 else 0
        
        # Update Submission
        submission.execution_summary = {"details": execution_details, "passed_count": passed_count, "total": total_tests}
        submission.score = score
        submission.grading_status = "completed"
        db.commit()

        # Update Assignment Status (Check if all questions submitted)
        assignment = db.query(TestAssignment).filter(TestAssignment.id == submission.assignment_id).first()
        if assignment:
            all_submissions = db.query(Submission).filter(Submission.assignment_id == assignment.id).all()
            latest_scores = {}
            for s in all_submissions:
                latest_scores[s.question_id] = s.score # Takes latest submission for question
            
            # If we have a score for every question, mark as completed? 
            # Or just leave it to explicit submit? 
            # The user wants "Final Submit" button. 
            # So we might not auto-complete assignment here, but we can update scores.
            pass

    except Exception as e:
        logger.error(f"Error grading submission {submission_id}: {e}")
        submission.grading_status = "error"
        db.commit()
    finally:
        db.close()
