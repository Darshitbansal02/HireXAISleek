"""
Diagnostic Script: Check Candidate Embeddings

This script checks if candidates (especially 100% complete ones) have valid embeddings.
"""

import sys
import os
import json
sys.path.insert(0, os.path.dirname(__file__))

from core.database import get_db
from models.candidate_profile import CandidateProfile
from models.user import User
from models.notification import Notification
from services.vector_service import calculate_completion_percentage

def check_embeddings():
    db = next(get_db())
    
    candidates = db.query(CandidateProfile).all()
    print(f"Total Candidates: {len(candidates)}")
    
    for profile in candidates:
        completion = calculate_completion_percentage(profile)
        has_embedding = bool(profile.embedding)
        
        print(f"\nCandidate ID: {profile.id} (User ID: {profile.user_id})")
        print(f"  Completion: {completion}%")
        print(f"  Has Embedding: {has_embedding}")
        
        if has_embedding:
            try:
                emb = json.loads(profile.embedding) if isinstance(profile.embedding, str) else profile.embedding
                print(f"  Embedding Length: {len(emb)}")
                if len(emb) == 0:
                    print("  [WARN] Embedding is empty list!")
            except Exception as e:
                print(f"  [WARN] Error parsing embedding: {e}")
        else:
            print("  [X] NO EMBEDDING FOUND")

        if completion == 100 and not has_embedding:
            print("  [CRITICAL] 100% Complete Profile missing embedding! This is why search fails.")

if __name__ == "__main__":
    check_embeddings()
