from typing import List, Optional, Any
from pydantic import BaseModel

class ExperienceItem(BaseModel):
    title: str
    company: str
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None
    current: bool = False

class EducationItem(BaseModel):
    degree: str
    school: str
    year: str
    field: str

class CompletionItem(BaseModel):
    key: str
    label: str
    weight: int
    completed: bool

class ProfileCompletion(BaseModel):
    percentage: int
    items: List[CompletionItem]

class CandidateProfileBase(BaseModel):
    headline: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = []
    experience: List[ExperienceItem] = []
    education: List[EducationItem] = []
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    resume_url: Optional[str] = None
    resume_preview: Optional[str] = None

class CandidateProfileCreate(CandidateProfileBase):
    pass

class CandidateProfileUpdate(CandidateProfileBase):
    pass

class CandidateProfileResponse(CandidateProfileBase):
    id: int
    user_id: int
    profile_completion: Optional[ProfileCompletion] = None

    model_config = {"from_attributes": True}

class CandidateProfileWithUser(CandidateProfileResponse):
    full_name: str
    email: str
