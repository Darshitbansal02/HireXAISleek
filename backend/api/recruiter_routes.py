from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.database import get_db
from core.auth import get_current_active_user
from models import Job, User, Application

router = APIRouter()

class JobIn(BaseModel):
    title: str
    description: str = ''
    location: str = ''
    min_experience: int = 0
    skills: str = ''
    company: str = 'Hiring Company'
    type: str = 'Full-time'

from services.vector_service import update_job_embedding
from models import Job, User, Application, CandidateProfile

@router.post('/post-job')
def post_job(payload: JobIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != 'recruiter' and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail='Forbidden')
    
    # Use recruiter_id instead of posted_by to match Job model
    job = Job(
        title=payload.title, 
        description=payload.description, 
        location=payload.location, 
        min_experience=payload.min_experience, 
        skills=payload.skills, 
        company=payload.company,
        type=payload.type,
        recruiter_id=current_user.id
    )
    db.add(job); db.commit(); db.refresh(job)
    
    # Generate embedding for the new job
    try:
        update_job_embedding(db, job.id)
    except Exception as e:
        print(f"Error generating embedding for job {job.id}: {e}")
        
    return {'job': {'id': job.id, 'title': job.title}}

@router.get('/my-posts')
def my_posts(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # DEBUG LOGGING TO FILE
    try:
        with open("d:/HireXAISleek/debug_my_posts.log", "a") as f:
            f.write(f"--- Request ---\n")
            f.write(f"User ID: {current_user.id}\n")
            f.write(f"User Email: {current_user.email}\n")
            
            jobs = db.query(Job).filter(Job.recruiter_id == current_user.id).all()
            f.write(f"Jobs Found: {len(jobs)}\n")
            for j in jobs:
                f.write(f"  Job ID: {j.id}, Title: {j.title}\n")
            f.write(f"---------------\n")
    except Exception as e:
        print(f"Logging failed: {e}")

    # Filter by recruiter_id
    jobs = db.query(Job).filter(Job.recruiter_id == current_user.id).all()
    return {'jobs': [{'id': j.id, 'title': j.title, 'skills': j.skills, 'company': j.company, 'location': j.location, 'type': j.type, 'created_at': j.created_at, 'status': j.status, 'recruiter_id': j.recruiter_id} for j in jobs]}

@router.get('/applications/{job_id}')
def applications(job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    # Check recruiter_id
    if not job or job.recruiter_id != current_user.id:
        raise HTTPException(status_code=404, detail='Job not found or forbidden')
    
    apps = db.query(Application).filter(Application.job_id == job_id).all()
    
    # Enrich with candidate details
    enriched_apps = []
    for app in apps:
        candidate_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == app.candidate_id).first()
        candidate_user = None
        if candidate_profile:
            candidate_user = db.query(User).filter(User.id == candidate_profile.user_id).first()
            
        enriched_apps.append({
            'id': app.id, 
            'candidate_id': app.candidate_id, 
            'status': app.status, 
            'applied_at': app.applied_at,
            'cover_letter': app.cover_letter,
            'candidate': {
                'full_name': candidate_user.full_name if candidate_user else 'Unknown',
                'email': candidate_user.email if candidate_user else 'Unknown',
                'id': candidate_user.id if candidate_user else None
            } if candidate_user else None,
            'candidate_profile': {
                'headline': candidate_profile.headline,
                'location': candidate_profile.location,
                'skills': candidate_profile.skills,
                'experience': candidate_profile.experience,
                'education': candidate_profile.education,
                'bio': candidate_profile.bio,
                'phone': candidate_profile.phone
            } if candidate_profile else None
        })
        
    return {'applications': enriched_apps}