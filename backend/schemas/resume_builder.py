from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, HttpUrl

class PersonalInfo(BaseModel):
    full_name: Optional[str] = ""
    title: Optional[str] = ""
    email: Optional[str] = ""   # ← allow empty for drafts
    phone: Optional[str] = ""
    location: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    portfolio_url: Optional[str] = ""
    summary: Optional[str] = ""

class ExperienceItem(BaseModel):
    id: str
    title: Optional[str] = ""
    company: Optional[str] = ""
    location: Optional[str] = ""
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    current: bool = False
    description: Optional[str] = ""

class EducationItem(BaseModel):
    id: str
    degree: Optional[str] = ""
    school: Optional[str] = ""
    location: Optional[str] = ""
    year: Optional[str] = ""
    field: Optional[str] = ""

class ProjectItem(BaseModel):
    id: str
    name: Optional[str] = ""
    description: Optional[str] = ""
    link: Optional[str] = ""
    technologies: List[str] = []

class SkillItem(BaseModel):
    category: str = "General"
    skills: List[str] = []

class ResumeStructure(BaseModel):
    personal_info: PersonalInfo
    experience: List[ExperienceItem] = []
    education: List[EducationItem] = []
    projects: List[ProjectItem] = []
    skills: List[SkillItem] = []
    custom_sections: List[dict] = []

class ResumeCreate(BaseModel):
    title: str = "My Resume"
    structured_content: ResumeStructure
    is_draft: bool = True

class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    structured_content: ResumeStructure
    is_draft: bool = True

class ResumeResponse(BaseModel):
    id: int
    candidate_id: int
    title: str
    structured_content: Optional[ResumeStructure] = None
    is_draft: bool
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
