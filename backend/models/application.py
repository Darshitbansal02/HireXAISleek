from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from datetime import datetime
from sqlalchemy.orm import relationship
from core.database import Base

class Application(Base):
    __tablename__ = 'applications'
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id'), index=True)
    candidate_id = Column(Integer, ForeignKey('candidate_profiles.id'), index=True)
    status = Column(String, default='applied')
    cover_letter = Column(Text, nullable=True)
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    
    job = relationship("Job", back_populates="applications")
    # We need to import CandidateProfile carefully to avoid circular imports, 
    # or just rely on foreign keys if we don't need direct object access often.
    # For now, let's keep it simple.
