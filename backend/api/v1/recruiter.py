from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from core.database import get_db
from core.auth import require_recruiter
from models.user import User
from models.job import Job
from models.application import Application
from models.resume import Resume
from models.candidate_profile import CandidateProfile
from models.notification import Notification
from schemas.job import JobCreate, JobResponse
from schemas.application import ApplicationResponse
from datetime import datetime
import os
from fastapi.responses import FileResponse

router = APIRouter()

@router.post("/post-job", response_model=JobResponse)
async def post_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    job = Job(
        **job_in.dict(),
        recruiter_id=current_user.id,
        created_at=datetime.utcnow(),
        is_active=True
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@router.get("/my-posts", response_model=List[JobResponse])
async def get_my_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    jobs = db.query(Job).filter(Job.recruiter_id == current_user.id).all()
    return jobs

@router.get("/applications/{job_id}", response_model=List[ApplicationResponse])
async def get_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    # Verify job belongs to recruiter
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied")

    # Get applications with candidate data
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    
    # Manually load candidate data and resume for each application
    for app in applications:
        app.candidate = db.query(User).filter(User.id == app.candidate_id).first()
        
        # Robustness: Handle missing candidate user
        if not app.candidate:
            continue
            
        # Get Candidate Profile (Basic Info)
        try:
            profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == app.candidate_id).first()
            if profile:
                app.candidate_profile = profile
        except Exception as e:
            print(f"Error fetching profile for candidate {app.candidate_id}: {e}")

        # Get primary resume
        try:
            resume = db.query(Resume).filter(Resume.candidate_id == app.candidate_id, Resume.is_primary == True).first()
            if resume:
                app.resume_content = resume.content
        except Exception as e:
            print(f"Error fetching resume for candidate {app.candidate_id}: {e}")
            # Continue without resume content
    
    return applications

@router.put("/applications/{application_id}/status")
async def update_application_status(
    application_id: int,
    status_update: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    # Verify application exists and belongs to a job owned by the recruiter
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
        
    job = db.query(Job).filter(Job.id == application.job_id, Job.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized to update this application")
    
    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
        
    application.status = new_status
    application.updated_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "status": new_status}

@router.delete("/job/{job_id}")
async def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    # Verify job belongs to recruiter
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied")
    
    db.delete(job)
    db.commit()
    return {"success": True, "message": "Job deleted successfully"}

# Helper for profile completion (duplicated from candidate.py to avoid circular imports)
from schemas.candidate_profile import CandidateProfileWithUser, ProfileCompletion, CompletionItem, CandidateProfileResponse

def calculate_profile_completion(profile: CandidateProfile) -> ProfileCompletion:
    items = [
        {"key": "resume_uploaded", "label": "Upload Resume", "weight": 20, "completed": bool(profile.resume_url)},
        {"key": "resume_analyzed", "label": "Analyze Resume", "weight": 20, "completed": bool(profile.resume_score and profile.resume_score > 0)},
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

@router.get("/candidate/{candidate_id}", response_model=CandidateProfileWithUser)
async def get_candidate_details(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    # candidate_id is the User ID
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == candidate_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Ensure user relationship is loaded
    if not profile.user:
        profile.user = db.query(User).filter(User.id == candidate_id).first()
        
    if not profile.user:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate completion
    completion = calculate_profile_completion(profile)
    
    # Construct response
    base_response = CandidateProfileResponse.from_orm(profile)
    
    response = CandidateProfileWithUser(
        **base_response.dict(),
        full_name=profile.user.full_name,
        email=profile.user.email
    )
    response.profile_completion = completion
    
    return response

@router.get("/candidate/{candidate_id}/resume")
async def get_candidate_resume(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    # candidate_id is the User ID
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == candidate_id).first()
    if not profile or not profile.resume_url:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    # Handle absolute paths
    if os.path.exists(profile.resume_url):
        return FileResponse(
            profile.resume_url, 
            filename=profile.resume_preview or f"resume_{candidate_id}.pdf", 
            media_type="application/pdf"
        )
        
    # Fallback for relative paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if not os.path.isabs(profile.resume_url):
         abs_path = os.path.join(BASE_DIR, profile.resume_url)
         if os.path.exists(abs_path):
             return FileResponse(
                 abs_path, 
                 filename=profile.resume_preview or f"resume_{candidate_id}.pdf", 
                 media_type="application/pdf"
            )

    raise HTTPException(status_code=404, detail="Resume file not found on server")

# Shortlisting Endpoints
from models.shortlisted_candidate import ShortlistedCandidate
from schemas.recruiter_actions import ShortlistCreate, ShortlistedCandidateResponse

@router.post("/shortlist", response_model=ShortlistedCandidateResponse)
async def shortlist_candidate(
    shortlist_in: ShortlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    # Verify candidate exists (Frontend sends User ID)
    candidate_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == shortlist_in.candidate_id).first()
    if not candidate_profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    # Check if already shortlisted using Profile ID AND Job ID
    existing = db.query(ShortlistedCandidate).filter(
        ShortlistedCandidate.recruiter_id == current_user.id,
        ShortlistedCandidate.candidate_id == candidate_profile.id,
        ShortlistedCandidate.job_id == shortlist_in.job_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Candidate already shortlisted for this opportunity")

    shortlist_entry = ShortlistedCandidate(
        recruiter_id=current_user.id,
        candidate_id=candidate_profile.id,
        job_id=shortlist_in.job_id
    )
    
    db.add(shortlist_entry)
    db.commit()
    db.refresh(shortlist_entry)
    
    # Create Notification for Candidate
    try:
        notif_title = "You've been Shortlisted!"
        notif_message = "A recruiter has shortlisted your profile for a potential opportunity."
        
        if shortlist_in.job_id:
            job = db.query(Job).filter(Job.id == shortlist_in.job_id).first()
            if job:
                notif_title = f"Shortlisted for {job.title}"
                notif_message = f"You have been shortlisted for the position of {job.title} at {job.company}."

        notification = Notification(
            user_id=candidate_profile.user_id,
            title=notif_title,
            message=notif_message,
            type="success",
            link_url="/candidate?tab=jobs",
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notification)
        db.commit()
        print(f"[DEBUG] Shortlist notification created for user {candidate_profile.user_id}")
    except Exception as e:
        print(f"[ERROR] Failed to create notification: {e}")
        # Don't fail the request
    
    # Enrich response
    candidate_data = None
    if candidate_profile:
        if not candidate_profile.user:
            candidate_profile.user = db.query(User).filter(User.id == candidate_profile.user_id).first()
        
        if candidate_profile.user:
            base_response = CandidateProfileResponse.from_orm(candidate_profile)
            profile_response = CandidateProfileWithUser(
                **base_response.dict(),
                full_name=candidate_profile.user.full_name,
                email=candidate_profile.user.email
            )
            profile_response.profile_completion = calculate_profile_completion(candidate_profile)
            candidate_data = profile_response

    return ShortlistedCandidateResponse(
        id=shortlist_entry.id,
        recruiter_id=shortlist_entry.recruiter_id,
        candidate_id=shortlist_entry.candidate_id,
        job_id=shortlist_entry.job_id,
        created_at=shortlist_entry.created_at,
        candidate=candidate_data
    )

@router.get("/shortlisted", response_model=List[ShortlistedCandidateResponse])
async def get_shortlisted_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    shortlisted = db.query(ShortlistedCandidate).filter(
        ShortlistedCandidate.recruiter_id == current_user.id
    ).order_by(ShortlistedCandidate.created_at.desc()).all()
    
    # Enrich with candidate details
    response_list = []
    for item in shortlisted:
        profile = db.query(CandidateProfile).filter(CandidateProfile.id == item.candidate_id).first()
        candidate_data = None
        
        if profile:
            # Manually construct response to include user details
            if not profile.user:
                profile.user = db.query(User).filter(User.id == profile.user_id).first()
            
            if profile.user:
                base_response = CandidateProfileResponse.from_orm(profile)
                profile_response = CandidateProfileWithUser(
                    **base_response.dict(),
                    full_name=profile.user.full_name,
                    email=profile.user.email
                )
                # Calculate completion for the nested profile
                profile_response.profile_completion = calculate_profile_completion(profile)
                candidate_data = profile_response

        # Create response object manually
        response_list.append(ShortlistedCandidateResponse(
            id=item.id,
            recruiter_id=item.recruiter_id,
            candidate_id=item.candidate_id,
            job_id=item.job_id,
            created_at=item.created_at,
            candidate=candidate_data
        ))

    return response_list

@router.delete("/shortlist/{candidate_id}")
async def remove_shortlist(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    # candidate_id from Frontend is User ID. We need to find the Profile ID first.
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == candidate_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    entry = db.query(ShortlistedCandidate).filter(
        ShortlistedCandidate.recruiter_id == current_user.id,
        ShortlistedCandidate.candidate_id == profile.id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Candidate not found in shortlist")
        
    db.delete(entry)
    db.commit()
    
    return {"success": True, "message": "Removed from shortlist"}

# Scheduling Endpoints
from models.scheduled_event import ScheduledEvent
from schemas.recruiter_actions import ScheduleCreate, ScheduledEventResponse

@router.post("/schedule", response_model=ScheduledEventResponse)
async def schedule_event(
    event_in: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    # Verify candidate exists (Frontend sends User ID)
    candidate_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == event_in.candidate_id).first()
    if not candidate_profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    event = ScheduledEvent(
        recruiter_id=current_user.id,
        candidate_id=candidate_profile.id,
        job_id=event_in.job_id,
        event_type=event_in.event_type,
        scheduled_at=event_in.scheduled_at,
        mode=event_in.mode,
        location_url=event_in.location_url,
        notes=event_in.notes
    )
    
    # --- AUTO-CREATE VIDEO SESSION ---
    # If it's an online interview, create a HireXAI InterviewSession
    if event.event_type == "interview" and event.mode == "online":
        import uuid
        from models.interview import InterviewSession, InterviewStatus
        
        # Generate Room ID
        room_id = str(uuid.uuid4())
        
        # Create Session
        interview_session = InterviewSession(
            room_id=room_id,
            recruiter_id=current_user.id,
            candidate_id=candidate_profile.user_id, # Must use User ID
            job_id=event_in.job_id,
            scheduled_at=event_in.scheduled_at,
            status=InterviewStatus.SCHEDULED
        )
        db.add(interview_session)
        
        # Update Event Link
        # Frontend logic usually redirects /interview/{roomId}
        # Recruiter link: /recruiter/interview/{roomId}
        # Candidate link: /candidate/interview/{roomId}
        # We'll store the relative path for now, or just the ID implies it.
        # Let's verify what the frontend expects in 'location_url'.
        # Usually it's a full link for external tools. 
        # For internal, we can put the room link.
        event.location_url = f"/candidate/interview/{room_id}"
        print(f"[DEBUG] Created InterviewSession {room_id} for ScheduledEvent")

    db.add(event)
    db.commit()
    db.refresh(event)

    # Create Notification for Candidate
    try:
        # Format date for message
        date_str = event.scheduled_at.strftime("%B %d, %Y at %I:%M %p")
        
        notification = Notification(
            user_id=candidate_profile.user_id, # Notify the candidate
            title=f"New {event.event_type.title()} Scheduled",
            message=f"You have a {event.mode.replace('_', ' ')} {event.event_type} scheduled for {date_str}. Check your dashboard for details.",
            type="schedule",
            link_url="/candidate?tab=jobs", # Or appropriate link
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notification)
        db.commit()
        print(f"[DEBUG] Notification created for user {candidate_profile.user_id}: {notification.title}")
    except Exception as e:
        print(f"[ERROR] Failed to create notification: {e}")
        import traceback
        traceback.print_exc()
        # Don't fail the request if notification fails
    
    # Enrich response with candidate details
    candidate_data = None
    if candidate_profile:
        # Ensure user relationship is loaded
        if not candidate_profile.user:
            candidate_profile.user = db.query(User).filter(User.id == candidate_profile.user_id).first()
            
        if candidate_profile.user:
            base_response = CandidateProfileResponse.from_orm(candidate_profile)
            candidate_data = CandidateProfileWithUser(
                **base_response.dict(),
                full_name=candidate_profile.user.full_name,
                email=candidate_profile.user.email
            )
            # Calculate completion if needed, though optional for this response
            # candidate_data.profile_completion = calculate_profile_completion(candidate_profile)

    return ScheduledEventResponse(
        id=event.id,
        recruiter_id=event.recruiter_id,
        candidate_id=event.candidate_id,
        job_id=event.job_id,
        event_type=event.event_type,
        scheduled_at=event.scheduled_at,
        mode=event.mode,
        location_url=event.location_url,
        notes=event.notes,
        status=event.status,
        created_at=event.created_at,
        candidate=candidate_data
    )

@router.get("/schedules", response_model=List[ScheduledEventResponse])
async def get_scheduled_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter)
):
    events = db.query(ScheduledEvent).filter(
        ScheduledEvent.recruiter_id == current_user.id
    ).order_by(ScheduledEvent.scheduled_at.asc()).all()
    
    # Enrich with candidate details
    response_list = []
    for event in events:
        profile = db.query(CandidateProfile).filter(CandidateProfile.id == event.candidate_id).first()
        candidate_data = None
        
        if profile:
            if not profile.user:
                profile.user = db.query(User).filter(User.id == profile.user_id).first()
            
            if profile.user:
                base_response = CandidateProfileResponse.from_orm(profile)
                profile_response = CandidateProfileWithUser(
                    **base_response.dict(),
                    full_name=profile.user.full_name,
                    email=profile.user.email
                )
                candidate_data = profile_response

        # Create response object manually
        response_list.append(ScheduledEventResponse(
            id=event.id,
            recruiter_id=event.recruiter_id,
            candidate_id=event.candidate_id,
            job_id=event.job_id,
            event_type=event.event_type,
            scheduled_at=event.scheduled_at,
            mode=event.mode,
            location_url=event.location_url,
            notes=event.notes,
            status=event.status,
            created_at=event.created_at,
            candidate=candidate_data
        ))

    return response_list
