from sqlalchemy import Column, Integer, String, Boolean, Enum
from sqlalchemy.orm import relationship
from core.database import Base
import enum

class UserRole(str, enum.Enum):
    CANDIDATE = "candidate"
    RECRUITER = "recruiter"
    ADMIN = "admin"

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    candidate_profile = relationship("CandidateProfile", back_populates="user", uselist=False) # Added this line
    notifications = relationship("Notification", back_populates="user") # Added this line
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, default='')
    role = Column(String, default=UserRole.CANDIDATE)
    is_active = Column(Boolean, default=True)
