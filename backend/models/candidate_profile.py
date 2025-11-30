from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from core.database import Base

class CandidateProfile(Base):
    __tablename__ = 'candidate_profiles'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, index=True)
    
    headline = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    
    # Storing structured data as JSON
    skills = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    experience = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    education = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    
    linkedin_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)
    
    # Resume fields
    resume_url = Column(String, nullable=True)
    resume_preview = Column(Text, nullable=True)
    resume_text = Column(Text, nullable=True)
    resume_summary = Column(Text, nullable=True)
    resume_score = Column(Integer, nullable=True) # 0-100
    resume_analysis = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Detailed feedback
    
    # Analytics & Search
    profile_views = Column(Integer, default=0)
    embedding = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Vector representation for semantic search
    
    # Relationship
    user = relationship("User", back_populates="candidate_profile")
    saved_jobs = relationship("SavedJob", back_populates="candidate")
