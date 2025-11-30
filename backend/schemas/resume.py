from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class ResumeBase(BaseModel):
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None

class ResumeCreate(ResumeBase):
    pass

class ResumeResponse(ResumeBase):
    id: int
    candidate_id: int
    created_at: datetime
    is_primary: bool

    model_config = {"from_attributes": True}
