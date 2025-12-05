import sys
import os

# Add backend directory to path to import models
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import SessionLocal
from models.interview import InterviewSession
from sqlalchemy import text

def clear_interviews():
    db = SessionLocal()
    try:
        print("Clearing all interview sessions...")
        # Delete all records from interview_sessions table
        db.query(InterviewSession).delete()
        db.commit()
        print("Successfully cleared all interview sessions.")
    except Exception as e:
        print(f"Error clearing interviews: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clear_interviews()
