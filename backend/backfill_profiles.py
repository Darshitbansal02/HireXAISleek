import sys
import os
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

# Add backend to path
sys.path.append(os.getcwd())

from core.config import settings
from core.database import SessionLocal
from models.user import User
from models.candidate_profile import CandidateProfile

def backfill_profiles():
    db = SessionLocal()
    try:
        print("Starting profile backfill...")
        
        # Get all candidates
        candidates = db.query(User).filter(User.role == "candidate").all()
        print(f"Found {len(candidates)} candidates.")
        
        created_count = 0
        existing_count = 0
        
        for user in candidates:
            # Check if profile exists
            profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).first()
            
            if not profile:
                print(f"Creating profile for user {user.id} ({user.email})...")
                new_profile = CandidateProfile(
                    user_id=user.id,
                    profile_views=0,
                    resume_score=0
                )
                db.add(new_profile)
                created_count += 1
            else:
                existing_count += 1
                
        db.commit()
        print(f"Backfill complete.")
        print(f"Created: {created_count}")
        print(f"Already Existed: {existing_count}")
        
    except Exception as e:
        print(f"Error during backfill: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill_profiles()
