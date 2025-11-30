from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base
import enum

class EventType(str, enum.Enum):
    INTERVIEW = "interview"
    TEST = "test"
    MEETING = "meeting"

class EventMode(str, enum.Enum):
    ONLINE = "online"
    IN_PERSON = "in_person"

class EventStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ScheduledEvent(Base):
    __tablename__ = "scheduled_events"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"))
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    
    event_type = Column(String, default=EventType.INTERVIEW) # interview, test, meeting
    scheduled_at = Column(DateTime, nullable=False)
    mode = Column(String, default=EventMode.ONLINE) # online, in_person
    location_url = Column(String, nullable=True) # Meeting link or physical address
    notes = Column(String, nullable=True)
    status = Column(String, default=EventStatus.SCHEDULED)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    candidate = relationship("CandidateProfile", foreign_keys=[candidate_id])
    job = relationship("Job", foreign_keys=[job_id])
