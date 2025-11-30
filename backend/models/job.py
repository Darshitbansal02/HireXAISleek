from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class Job(Base):
    __tablename__ = 'jobs'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    location = Column(String)
    min_experience = Column(Integer, default=0)
    skills = Column(String)
    recruiter_id = Column(Integer) # Renamed from posted_by for consistency
    company = Column(String, default="Hiring Company")
    type = Column(String, default="Full-time")
    is_active = Column(Boolean, default=True)
    status = Column(String, default="active") # active, closed, draft
    views = Column(Integer, default=0)
    embedding = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Vector representation
    created_at = Column(DateTime, default=datetime.utcnow)
    
    applications = relationship("Application", back_populates="job")
    saved_by = relationship("SavedJob", back_populates="job")
