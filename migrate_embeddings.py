import sys
import os
import logging

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import SessionLocal
from services.vector_service import regenerate_all_embeddings

# Import ALL models to ensure SQLAlchemy registry is populated
from models.user import User
from models.job import Job
from models.candidate_profile import CandidateProfile
from models.notification import Notification
from models.application import Application
from models.test_system import Test, TestQuestion, TestAssignment
from models.interview import InterviewSession

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    logger.info("🚀 Starting Embedding Migration (Gemini 768d)...")
    db = SessionLocal()
    try:
        regenerate_all_embeddings(db)
        logger.info("✅ Migration Complete!")
    except Exception as e:
        logger.error(f"❌ Migration Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
