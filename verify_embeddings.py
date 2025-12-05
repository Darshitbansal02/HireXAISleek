import sys
import os
import logging
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.database import SessionLocal
from services.vector_service import generate_embedding, search_candidates
from models.candidate_profile import CandidateProfile

# Import ALL models to ensure SQLAlchemy registry is populated
from models.user import User
from models.job import Job
from models.notification import Notification
from models.application import Application
from models.test_system import Test, TestQuestion, TestAssignment
from models.interview import InterviewSession

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    logger.info("🔍 Verifying Gemini Embeddings...")
    
    # 1. Check Dimension
    test_text = "Software Engineer with Python skills"
    emb = generate_embedding(test_text)
    dim = len(emb)
    logger.info(f"Generated embedding dimension: {dim}")
    
    if dim != 768:
        logger.error(f"❌ Expected 768 dimensions, got {dim}")
        sys.exit(1)
    else:
        logger.info("✅ Dimension check passed (768d).")

    # 2. Check Database Search
    db = SessionLocal()
    try:
        # Ensure we have at least one candidate
        candidate = db.query(CandidateProfile).first()
        if not candidate:
            logger.warning("⚠ No candidates in DB to test search.")
        else:
            # Check if candidate has embedding
            if not candidate.embedding:
                 logger.error(f"❌ Candidate {candidate.id} has no embedding!")
            else:
                 cand_emb = json.loads(candidate.embedding)
                 logger.info(f"Candidate {candidate.id} embedding dimension: {len(cand_emb)}")
                 if len(cand_emb) != 768:
                     logger.error(f"❌ Candidate embedding dimension mismatch: {len(cand_emb)}")
            
            # Perform search
            results = search_candidates(db, "Python", limit=5)
            logger.info(f"Search returned {len(results)} results.")
            if len(results) > 0:
                logger.info("✅ Search functionality verified.")
            else:
                logger.warning("⚠ Search returned 0 results (might be expected if no match).")

    except Exception as e:
        logger.error(f"❌ Verification Failed: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
