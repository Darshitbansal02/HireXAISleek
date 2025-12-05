import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

try:
    print("Importing JudgeService...")
    from services.judge_service import judge_service
    print("JudgeService imported successfully.")

    print("Importing Grading Worker...")
    from workers.grading import grade_submission
    print("Grading Worker imported successfully.")

    print("Importing Assignments Router...")
    from api.routers.assignments import router
    print("Assignments Router imported successfully.")

    print("Importing Models...")
    from models.test_system import Submission
    print("Models imported successfully.")

    print("All checks passed!")
except Exception as e:
    print(f"Verification Failed: {e}")
    sys.exit(1)
