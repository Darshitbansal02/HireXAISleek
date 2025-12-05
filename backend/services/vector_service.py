import google.generativeai as genai
from core.config import settings
import json
import math
from sqlalchemy.orm import Session
from models.job import Job
from models.candidate_profile import CandidateProfile
import logging
import numpy as np

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# -----------------------------
#  PRIMARY MODEL — Gemini (768d)
# -----------------------------

# Normalize vectors
def _normalize(vec):
    if not vec:
        return []
    arr = np.array(vec, dtype=float)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return arr.tolist()
    return (arr / norm).tolist()


# ------------------------------------------------------
#  EMBEDDING PIPELINE (Gemini Only)
# ------------------------------------------------------
def generate_embedding(text: str) -> list[float]:
    """
    Generates 768-dimensional embeddings using Gemini.
    """
    if not text or not text.strip():
        return []

    if settings.GEMINI_API_KEY:
        try:
            # logger.debug("Generating embedding using Gemini...")
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document",
            )
            emb = result.get("embedding", [])
            return _normalize(emb)  # Normalize 768-D vector
        except Exception as e:
            logger.error(f"Gemini Embedding Error: {e}")
            return []
    else:
        logger.warning("GEMINI_API_KEY not set. Cannot generate embeddings.")
        return []


# -------------------------
#  COSINE SIMILARITY
# -------------------------
def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    if not v1 or not v2:
        return 0.0

    # Cannot compare vectors of different dimensions
    if len(v1) != len(v2):
        return 0.0

    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


# -------------------------
#  JOB RECOMMENDATION
# -------------------------
def recommend_jobs(db: Session, target_embedding: list[float], limit: int = 10) -> list[Job]:
    if not target_embedding:
        return []

    jobs = db.query(Job).filter(Job.status == 'active').all()
    scored_jobs = []

    for job in jobs:
        if job.embedding:
            try:
                job_emb = json.loads(job.embedding) if isinstance(job.embedding, str) else job.embedding
                score = cosine_similarity(target_embedding, job_emb)
                scored_jobs.append((job, score))
            except Exception:
                continue

    scored_jobs.sort(key=lambda x: x[1], reverse=True)
    return [job for job, score in scored_jobs[:limit]]


def search_jobs(db: Session, query: str, limit: int = 10) -> list[Job]:
    query_embedding = generate_embedding(query)
    if not query_embedding:
        return []
    return recommend_jobs(db, query_embedding, limit)


# -------------------------
#  CANDIDATE SEARCH
# -------------------------
def calculate_completion_percentage(profile: CandidateProfile) -> int:
    """Calculate profile completion percentage (0-100)."""
    items = [
        {"weight": 20, "completed": bool(profile.resume_url)},
        {"weight": 20, "completed": bool(profile.resume_score and profile.resume_score > 0)},
        {"weight": 15, "completed": bool(profile.skills and len(profile.skills) > 0)},
        {"weight": 15, "completed": bool(profile.experience and len(profile.experience) > 0)},
        {"weight": 10, "completed": bool(profile.education and len(profile.education) > 0)},
        {"weight": 5, "completed": bool(profile.headline)},
        {"weight": 5, "completed": bool(profile.bio)},
        {"weight": 5, "completed": bool(profile.location)},
        {"weight": 5, "completed": bool(profile.phone)},
    ]
    
    total_weight = sum(item["weight"] for item in items)
    completed_weight = sum(item["weight"] for item in items if item["completed"])
    return int((completed_weight / total_weight) * 100) if total_weight > 0 else 0


def search_candidates(db: Session, query: str, limit: int = 10) -> list[CandidateProfile]:
    logger.info(f"Searching candidates for '{query}'")

    query_embedding = generate_embedding(query)
    if not query_embedding:
        logger.warning("Query embedding failed.")
        return []

    # Fetch all candidates
    all_candidates = db.query(CandidateProfile).all()
    
    # Filter for 100% complete profiles only
    complete_candidates = []
    for profile in all_candidates:
        completion = calculate_completion_percentage(profile)
        if completion == 100:
            complete_candidates.append(profile)
    
    logger.info(f"Filtered to {len(complete_candidates)} candidates with 100% complete profiles (from {len(all_candidates)} total)")
    
    # Score complete candidates by semantic similarity
    scored = []
    for profile in complete_candidates:
        # Auto-heal: Generate embedding if missing
        if not profile.embedding:
            logger.warning(f"Candidate {profile.id} missing embedding. Generating now...")
            update_candidate_embedding(db, profile.id)
            db.refresh(profile)
            
        if profile.embedding:
            try:
                emb = json.loads(profile.embedding) if isinstance(profile.embedding, str) else profile.embedding
                score = cosine_similarity(query_embedding, emb)
                scored.append((profile, score))
            except Exception as e:
                logger.error(f"Error scoring candidate {profile.id}: {e}")

    scored.sort(key=lambda x: x[1], reverse=True)
    return [p for p, s in scored[:limit]]


# -------------------------
#  INDIVIDUAL EMBEDDING UPDATER
# -------------------------
def update_job_embedding(db: Session, job_id: int):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return

    text = f"{job.title} {job.description} {job.skills} {job.company} {job.location}"
    job.embedding = json.dumps(generate_embedding(text))
    db.commit()


def update_candidate_embedding(db: Session, profile_id: int):
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    if not profile:
        return

    # Construct rich text representation including skills, experience, and education
    parts = [
        profile.headline or "",
        profile.bio or "",
        profile.location or ""
    ]
    
    # Add Skills
    if profile.skills:
        skills_str = " ".join(profile.skills) if isinstance(profile.skills, list) else str(profile.skills)
        parts.append(f"Skills: {skills_str}")
        
    # Add Experience
    if profile.experience:
        exp_texts = [f"{exp.get('title', '')} at {exp.get('company', '')}" for exp in profile.experience]
        parts.append(f"Experience: {'; '.join(exp_texts)}")
        
    # Add Education
    if profile.education:
        edu_texts = [f"{edu.get('degree', '')} from {edu.get('school', '')}" for edu in profile.education]
        parts.append(f"Education: {'; '.join(edu_texts)}")

    text = " ".join(filter(None, parts))
    
    try:
        profile.embedding = json.dumps(generate_embedding(text))
        db.commit()
        logger.info(f"Updated embedding for candidate {profile_id}")
    except Exception as e:
        logger.error(f"Failed to update embedding for candidate {profile_id}: {e}")


# --------------------------------------------------
#  🔥 FULL RE-EMBEDDING PIPELINE (Add this function)
# --------------------------------------------------
def regenerate_all_embeddings(db: Session):
    """
    Recompute embeddings for ALL jobs and ALL candidates.
    Needed when switching model dimension from Gemini → MiniLM.
    """

    logger.warning("⚠ Recomputing ALL embeddings (jobs + candidates)...")

    jobs = db.query(Job).all()
    candidates = db.query(CandidateProfile).all()

    # Re-embed Jobs
    for job in jobs:
        update_job_embedding(db, job.id)

    # Re-embed Candidates
    for profile in candidates:
        update_candidate_embedding(db, profile.id)

    logger.info("✅ All embeddings regenerated successfully.")
