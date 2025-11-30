from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from schemas.job import JobResponse
from schemas.user import UserResponse
from schemas.candidate_profile import CandidateProfileResponse

class ApplicationBase(BaseModel):
    cover_letter: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    job_id: int

class ApplicationResponse(ApplicationBase):
    id: int
    job_id: int
    candidate_id: int
    status: str
    applied_at: datetime
    
    # ✅ ADD THIS LINE (Must be Optional for existing data)
    updated_at: Optional[datetime] = None 

    job: Optional[JobResponse] = None
    candidate: Optional[UserResponse] = None
    candidate_profile: Optional[CandidateProfileResponse] = None
    resume_content: Optional[str] = None

    model_config = {"from_attributes": True}