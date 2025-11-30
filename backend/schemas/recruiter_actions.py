from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from schemas.candidate_profile import CandidateProfileResponse, CandidateProfileWithUser

class ShortlistCreate(BaseModel):
    candidate_id: int
    job_id: Optional[int] = None

class ScheduleCreate(BaseModel):
    candidate_id: int
    job_id: Optional[int] = None
    event_type: str = "interview"
    scheduled_at: datetime
    mode: str = "online"
    location_url: Optional[str] = None
    notes: Optional[str] = None

class ScheduledEventResponse(BaseModel):
    id: int
    recruiter_id: int
    candidate_id: int
    job_id: Optional[int]
    event_type: str
    scheduled_at: datetime
    mode: str
    location_url: Optional[str]
    notes: Optional[str]
    status: str
    created_at: datetime
    candidate: Optional[CandidateProfileWithUser] = None # Nested candidate details with user info

    model_config = {"from_attributes": True}

class ShortlistedCandidateResponse(BaseModel):
    id: int
    recruiter_id: int
    candidate_id: int
    job_id: Optional[int]
    created_at: datetime
    candidate: Optional[CandidateProfileWithUser] = None # Nested candidate details with user info

    model_config = {"from_attributes": True}
