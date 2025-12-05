from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime
import enum

class InterviewStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class InterviewSession(Base):
    __tablename__ = 'interview_sessions'
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, unique=True, index=True, nullable=False)
    recruiter_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    candidate_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    job_id = Column(Integer, ForeignKey('jobs.id'), nullable=True)
    
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String, default=InterviewStatus.SCHEDULED)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    candidate = relationship("User", foreign_keys=[candidate_id])
    job = relationship("Job")
