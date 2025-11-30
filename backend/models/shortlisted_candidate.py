from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class ShortlistedCandidate(Base):
    __tablename__ = "shortlisted_candidates"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"))
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    candidate = relationship("CandidateProfile", foreign_keys=[candidate_id])
    job = relationship("Job", foreign_keys=[job_id])
