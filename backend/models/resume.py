from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from core.database import Base

class Resume(Base):
    __tablename__ = 'resumes'
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, index=True) # Renamed from user_id
    title = Column(String, default="My Resume")
    file_url = Column(String, nullable=True)
    content = Column(Text) # Raw text content for searching/indexing
    structured_content = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True) # Full JSON structure
    is_primary = Column(Boolean, default=False)
    is_draft = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    embedding = Column(Text, nullable=True)  # JSON string of vector
