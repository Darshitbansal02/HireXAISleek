from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class JobBase(BaseModel):
    title: str
    description: str
    location: str
    min_experience: int
    skills: str
    company: Optional[str] = "Hiring Company"
    type: Optional[str] = "Full-time"

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: int
    recruiter_id: int
    created_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}

class JobList(BaseModel):
    jobs: List[JobResponse]
