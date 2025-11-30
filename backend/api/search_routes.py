from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.database import get_db
from core.auth import get_current_user
from models.user import User
from models.shortlisted_candidate import ShortlistedCandidate
from services.vector_service import search_jobs, search_candidates, update_job_embedding, update_candidate_embedding

router = APIRouter()

class SearchQuery(BaseModel):
    query: str
    limit: int = 10

@router.post("/jobs")
def search_jobs_endpoint(
    search: SearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Semantic search for jobs."""
    results = search_jobs(db, search.query, search.limit)
    return results

@router.post("/candidates")
def search_candidates_endpoint(
    search: SearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Semantic search for candidates (Recruiter only)."""
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    results = search_candidates(db, search.query, search.limit)
    print(f"[DEBUG] search_candidates returned {len(results)} results")
    
    # Get set of shortlisted candidate IDs for efficient lookup
    shortlisted_ids = set()
    if results:
        candidate_ids = [p.id for p in results]
        shortlists = db.query(ShortlistedCandidate).filter(
            ShortlistedCandidate.recruiter_id == current_user.id,
            ShortlistedCandidate.candidate_id.in_(candidate_ids)
        ).all()
        shortlisted_ids = {s.candidate_id for s in shortlists}

    # Enrich results with user details
    enriched_results = []
    for profile in results:
        print(f"[DEBUG] Processing profile id={profile.id}, user_id={profile.user_id}")
        user = db.query(User).filter(User.id == profile.user_id).first()
        if user:
            print(f"[DEBUG] Found user {user.id} for profile {profile.id}")
            # Create a dict with profile and user data
            candidate_data = {
                "id": profile.user_id, # Use user_id as the main ID for frontend (required for get_candidate_details)
                "profile_id": profile.id,
                "user_id": profile.user_id,
                "headline": profile.headline,
                "location": profile.location,
                "experience_years": len(profile.experience) if profile.experience else 0, # Approximate
                "skills": profile.skills,
                "similarity": getattr(profile, 'similarity', 0), # Added by search_candidates
                "full_name": user.full_name,
                "email": user.email,
                "is_shortlisted": profile.id in shortlisted_ids
            }
            enriched_results.append(candidate_data)
        else:
            print(f"[DEBUG] User not found for profile {profile.id} (user_id={profile.user_id})")
            
    print(f"[DEBUG] Returning {len(enriched_results)} enriched results")
    return enriched_results

@router.post("/jobs/{job_id}/update-embedding")
def trigger_job_embedding_update(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    background_tasks.add_task(update_job_embedding, db, job_id)
    return {"message": "Embedding update triggered"}
