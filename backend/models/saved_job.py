from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class SavedJob(Base):
    __tablename__ = 'saved_jobs'
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey('candidate_profiles.id'))
    job_id = Column(Integer, ForeignKey('jobs.id'))
    saved_at = Column(DateTime, default=datetime.utcnow)
    
    candidate = relationship("CandidateProfile", back_populates="saved_jobs")
    job = relationship("Job", back_populates="saved_by")
