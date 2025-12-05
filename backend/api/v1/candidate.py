from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from core.database import get_db
from core.auth import require_candidate
from models.user import User
from models.job import Job
from models.application import Application
from models.candidate_profile import CandidateProfile
from models.resume import Resume
from models.scheduled_event import ScheduledEvent
from schemas.application import ApplicationResponse
from schemas.candidate_profile import CandidateProfileResponse, CandidateProfileCreate, CandidateProfileUpdate, ProfileCompletion, CompletionItem
from datetime import datetime
import mimetypes
import uuid
import httpx
from fastapi.responses import StreamingResponse
from supabase import create_client, Client
from core.config import settings

# Initialize Supabase Client
supabase: Client = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

router = APIRouter()

def get_profile_by_user_id(db: Session, user_id: int):
    return db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()

def calculate_profile_completion(profile: CandidateProfile) -> ProfileCompletion:
    # Resume analyzed if we have a summary OR a score
    resume_analyzed = bool((profile.resume_summary or (profile.resume_score and profile.resume_score > 0)))
    
    items = [
        {"key": "resume_uploaded", "label": "Upload Resume", "weight": 20, "completed": bool(profile.resume_url)},
        {"key": "resume_analyzed", "label": "Analyze Resume", "weight": 20, "completed": resume_analyzed},
        {"key": "skills", "label": "Add Skills", "weight": 15, "completed": bool(profile.skills and len(profile.skills) > 0)},
        {"key": "experience", "label": "Add Experience", "weight": 15, "completed": bool(profile.experience and len(profile.experience) > 0)},
        {"key": "education", "label": "Add Education", "weight": 10, "completed": bool(profile.education and len(profile.education) > 0)},
        {"key": "headline", "label": "Professional Headline", "weight": 5, "completed": bool(profile.headline)},
        {"key": "bio", "label": "Professional Bio", "weight": 5, "completed": bool(profile.bio)},
        {"key": "location", "label": "Location", "weight": 5, "completed": bool(profile.location)},
        {"key": "phone", "label": "Phone Number", "weight": 5, "completed": bool(profile.phone)},
    ]
    
    total_weight = sum(item["weight"] for item in items)
    completed_weight = sum(item["weight"] for item in items if item["completed"])
    percentage = int((completed_weight / total_weight) * 100) if total_weight > 0 else 0
    
    return ProfileCompletion(
        percentage=percentage,
        items=[CompletionItem(**item) for item in items]
    )

@router.get("/profile", response_model=CandidateProfileResponse)
async def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    profile = get_profile_by_user_id(db, current_user.id)
    if not profile:
        # Create default profile if not exists
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Calculate completion
    completion = calculate_profile_completion(profile)
    
    response = CandidateProfileResponse.from_orm(profile)
    response.profile_completion = completion
    return response

from sqlalchemy.orm.attributes import flag_modified

@router.put("/profile", response_model=CandidateProfileResponse)
async def update_profile(
    profile_in: CandidateProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    profile = get_profile_by_user_id(db, current_user.id)
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)
    
    update_data = profile_in.dict(exclude_unset=True)
    
    # DEBUG LOGGING
    if 'experience' in update_data:
        print(f"[DEBUG] Updating experience: {len(update_data['experience'])} items")
        for item in update_data['experience']:
            print(f"  - {item}")
    if 'education' in update_data:
        print(f"[DEBUG] Updating education: {len(update_data['education'])} items")
        
    for field, value in update_data.items():
        setattr(profile, field, value)
        # Explicitly flag JSON fields as modified to ensure SQLAlchemy updates them
        if field in ['experience', 'education', 'skills']:
            flag_modified(profile, field)
        
    db.commit()
    db.refresh(profile)
    
    # Calculate completion
    completion = calculate_profile_completion(profile)
    
    response = CandidateProfileResponse.from_orm(profile)
    response.profile_completion = completion
    return response

@router.post("/apply/{job_id}", response_model=ApplicationResponse)
async def apply_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    # Check if job exists
    job = db.query(Job).filter(Job.id == job_id, Job.is_active == True).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    profile = get_profile_by_user_id(db, current_user.id)

    # Enforce 100% Profile Completion
    completion = calculate_profile_completion(profile)
    if completion.percentage < 100:
        missing = [item.label for item in completion.items if not item.completed]
        raise HTTPException(
            status_code=400, 
            detail={
                "error": "profile_incomplete",
                "message": "Profile incomplete. You must complete your profile to apply.",
                "missing": missing
            }
        )

    # Check if already applied
    existing_application = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == profile.id
    ).first()

    if existing_application:
        raise HTTPException(status_code=400, detail="Already applied to this job")

    # Create application
    application = Application(
        job_id=job_id,
        candidate_id=profile.id,
        status="pending",
        applied_at=datetime.utcnow()
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return application

@router.get("/applications")
async def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    profile = get_profile_by_user_id(db, current_user.id)
    if not profile:
        return {"applications": []}
        
    applications = db.query(Application).filter(Application.candidate_id == profile.id).all()
    
    # Enrich with job details and scheduled events
    result = []
    existing_job_ids = set()
    
    for app in applications:
        existing_job_ids.add(app.job_id)
        job = db.query(Job).filter(Job.id == app.job_id).first()
        
        # Check for scheduled event
        # Logic: Show event if it matches job_id OR if it's a general event (job_id is None) created AFTER application
        # AND the event must be created by the SAME recruiter who posted the job
        event = db.query(ScheduledEvent).filter(
            ScheduledEvent.candidate_id == profile.id,
            ScheduledEvent.recruiter_id == job.recruiter_id,
            ScheduledEvent.job_id == app.job_id,
            ScheduledEvent.status == "scheduled"
        ).order_by(ScheduledEvent.created_at.desc()).first()
        
        app_dict = {
            "id": app.id,
            "job_id": app.job_id,
            "status": app.status,
            "applied_at": app.applied_at,
            "job": job,
            "scheduled_event": event
        }
        result.append(app_dict)

    # --- ADD SHORTLISTED ENTRIES AS VIRTUAL APPLICATIONS ---
    from models.shortlisted_candidate import ShortlistedCandidate
    shortlisted = db.query(ShortlistedCandidate).filter(ShortlistedCandidate.candidate_id == profile.id).all()
    
    for item in shortlisted:
        # If already applied, skip (it's covered above)
        if item.job_id and item.job_id in existing_job_ids:
            continue
            
        # Validate Recruiter existence
        recruiter_user = db.query(User).filter(User.id == item.recruiter_id).first()
        if not recruiter_user:
            continue # Skip if recruiter deleted

        # Validate Job existence if job_id is present
        job = None
        recruiter_name = "Recruiter Interest"
        
        if item.job_id:
            job = db.query(Job).filter(Job.id == item.job_id).first()
            if not job:
                continue # Skip orphaned shortlist (job deleted)
            recruiter_name = job.company # Use company name for specific jobs
        
        # Check for scheduled event for this shortlist
        # STRICT SEPARATION: Handle General vs Job-Specific separately
        if item.job_id:
            # Case 1: Specific Job Shortlist
            # Find event for THIS job OR a recent general event from THIS recruiter
            event = db.query(ScheduledEvent).filter(
                ScheduledEvent.candidate_id == profile.id,
                ScheduledEvent.recruiter_id == item.recruiter_id,
                or_(
                    ScheduledEvent.job_id == item.job_id,
                    and_(
                        ScheduledEvent.job_id == None,
                        ScheduledEvent.created_at >= item.created_at
                    )
                ),
                ScheduledEvent.status == "scheduled"
            ).order_by(ScheduledEvent.created_at.desc()).first()
        else:
            # Case 2: General Shortlist (job_id is None)
            # ONLY find General Events from THIS recruiter created AFTER the shortlist
            event = db.query(ScheduledEvent).filter(
                ScheduledEvent.candidate_id == profile.id,
                ScheduledEvent.recruiter_id == item.recruiter_id,
                ScheduledEvent.job_id == None, # MUST be general
                ScheduledEvent.created_at >= item.created_at,
                ScheduledEvent.status == "scheduled"
            ).order_by(ScheduledEvent.created_at.desc()).first()

        # Create virtual application
        virtual_app = {
            "id": -item.id, # Negative ID to distinguish from real applications
            "job_id": item.job_id or 0, # 0 for general
            "status": "shortlisted",
            "applied_at": item.created_at,
            "job": job or {"title": "General Opportunity", "company": recruiter_name, "location": "Remote"},
            "scheduled_event": event
        }
        result.append(virtual_app)
        
    # Sort by date desc
    result.sort(key=lambda x: x['applied_at'], reverse=True)

    return {"applications": result}

from schemas.job import JobList, JobResponse

@router.get("/jobs", response_model=JobList)
async def get_jobs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    jobs = db.query(Job).filter(Job.is_active == True).offset(skip).limit(limit).all()
    return {"jobs": jobs}

@router.get("/jobs/saved", response_model=JobList)
async def get_saved_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    # Mock implementation for now as SavedJob model might not exist
    # In a real app, you'd query a SavedJob table
    return {"jobs": []}

@router.post("/jobs/save/{job_id}")
async def save_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    # Mock implementation
    return {"success": True, "message": "Job saved"}

@router.get("/jobs/recommended", response_model=JobList)
async def get_recommended_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    jobs = db.query(Job).filter(Job.is_active == True).order_by(Job.created_at.desc()).limit(5).all()
    return {"jobs": jobs}

# Resume Management Endpoints (Refactored for Supabase)
import shutil
import os
from fastapi.responses import FileResponse
from pypdf import PdfReader
from io import BytesIO

@router.post("/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    # Validate file type
    if not file.filename.lower().endswith(('.pdf', '.docx', '.txt')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, DOCX, and TXT are allowed.")
    
    # Check if Supabase is configured
    if not supabase:
        raise HTTPException(status_code=500, detail="Storage service not configured")
        
    bucket_name = settings.SUPABASE_STORAGE_BUCKET
    file_ext = mimetypes.guess_extension(file.content_type) or ".pdf"
    file_name = f"{current_user.id}/{uuid.uuid4()}{file_ext}"
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Upload to Supabase
        res = supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Get Public URL
        public_url_resp = supabase.storage.from_(bucket_name).get_public_url(file_name)
        # Handle string or object response
        public_url = public_url_resp if isinstance(public_url_resp, str) else public_url_resp.public_url

        # Update CandidateProfile
        profile = get_profile_by_user_id(db, current_user.id)
        if not profile:
            profile = CandidateProfile(user_id=current_user.id)
            db.add(profile)
        
        profile.resume_url = public_url
        profile.resume_preview = file.filename
        
        # Reset analysis fields
        profile.resume_score = None
        profile.resume_analysis = None
        profile.resume_summary = None
        profile.resume_text = None
        
        # Also create/update Resume table for history/consistency
        new_resume = Resume(
            candidate_id=current_user.id,
            title=file.filename,
            file_url=public_url,
            is_primary=True,
            version=1
        )
        db.add(new_resume)
        
        db.commit()
        
        return {"filename": file.filename, "url": public_url}
        
    except Exception as e:
        print(f"[Upload Error] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/resume/file")
async def get_resume_file(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    profile = get_profile_by_user_id(db, current_user.id)
    if not profile or not profile.resume_url:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    # Check if remote URL (Supabase)
    if profile.resume_url.startswith("http"):
        # Proxy the file from Supabase
        async def iterfile():
            async with httpx.AsyncClient() as client:
                async with client.stream("GET", profile.resume_url) as response:
                    async for chunk in response.aiter_bytes():
                        yield chunk
                        
        return StreamingResponse(iterfile(), media_type="application/pdf")
    
    # Fallback for legacy local files (should be removed eventually)
    return FileResponse(profile.resume_url, filename=profile.resume_preview or "resume.pdf", media_type="application/pdf")

@router.delete("/resume")
async def delete_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    profile = get_profile_by_user_id(db, current_user.id)
    if profile and profile.resume_url:
        # Try to delete from Supabase if it's a URL
        if profile.resume_url.startswith("http") and supabase:
            try:
                # Extract path from URL (naive approach, better to store path)
                # URL: https://.../storage/v1/object/public/resumes/USER_ID/UUID.pdf
                # Path: USER_ID/UUID.pdf
                # We can try to extract it from the URL structure or just extract the filename if we know it
                path = profile.resume_url.split(f"/{settings.SUPABASE_STORAGE_BUCKET}/")[-1]
                supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([path])
            except Exception as e:
                print(f"Error deleting from Supabase: {e}")
        
        # Fallback local delete
        elif profile.resume_url and os.path.exists(profile.resume_url):
            try:
                os.remove(profile.resume_url)
            except:
                pass
                
        profile.resume_url = None
        profile.resume_preview = None
        profile.resume_score = None
        profile.resume_analysis = None
        profile.resume_text = None
        profile.resume_summary = None
        db.commit()
        
    return {"success": True}

@router.post("/resume/extract")
async def extract_resume_text(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    profile = get_profile_by_user_id(db, current_user.id)
    if not profile or not profile.resume_url:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    text = ""
    try:
        # Handle remote URL
        if profile.resume_url.startswith("http"):
            async with httpx.AsyncClient() as client:
                resp = await client.get(profile.resume_url)
                file_bytes = BytesIO(resp.content)
                
                if profile.resume_url.lower().endswith('.pdf'):
                    reader = PdfReader(file_bytes)
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                else:
                    text = file_bytes.read().decode('utf-8', errors='ignore')

        # Fallback local
        elif os.path.exists(profile.resume_url):
             if profile.resume_url.lower().endswith('.pdf'):
                reader = PdfReader(profile.resume_url)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
             else:
                with open(profile.resume_url, 'r', errors='ignore') as f:
                    text = f.read()
        else:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Save extracted text to DB
        profile.resume_text = text
        db.commit()
                
        return {"text": text, "structured": {}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")
