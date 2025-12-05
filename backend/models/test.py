from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Float, Text
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

class Test(Base):
    __tablename__ = 'tests'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    job_id = Column(Integer, ForeignKey('jobs.id'), nullable=True)
    recruiter_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    duration_minutes = Column(Integer, default=60)
    passing_score = Column(Float, default=70.0)
    encrypted = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job = relationship("Job")
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan")
    assignments = relationship("TestAssignment", back_populates="test")

class Question(Base):
    __tablename__ = 'questions'
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey('tests.id'), nullable=False)
    type = Column(String, nullable=False) # mcq, coding, short_answer
    
    # Encrypted Fields
    encrypted_question = Column(Text, nullable=False)
    encrypted_options = Column(Text, nullable=True) # JSON string encrypted
    encrypted_answer_key = Column(Text, nullable=True) # JSON string encrypted
    
    test = relationship("Test", back_populates="questions")

class TestAssignment(Base):
    __tablename__ = 'test_assignments'
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey('tests.id'), nullable=False)
    candidate_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    assigned_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)
    passed = Column(Boolean, default=False)
    status = Column(String, default="pending") # pending, in_progress, submitted, expired
    
    # Relationships
    test = relationship("Test", back_populates="assignments")
    candidate = relationship("User", foreign_keys=[candidate_id])
    proctor_logs = relationship("ProctorLog", back_populates="assignment")
    responses = relationship("TestResponse", back_populates="assignment")

class ProctorLog(Base):
    __tablename__ = 'proctor_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey('test_assignments.id'), nullable=False)
    event_type = Column(String, nullable=False) # tab_switch, fullscreen_exit, face_mismatch
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(String, nullable=True)
    
    assignment = relationship("TestAssignment", back_populates="proctor_logs")

class TestResponse(Base):
    __tablename__ = 'test_responses'
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey('test_assignments.id'), nullable=False)
    question_id = Column(Integer, ForeignKey('questions.id'), nullable=False)
    
    candidate_answer = Column(Text, nullable=True)
    code_submission = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    assignment = relationship("TestAssignment", back_populates="responses")
    question = relationship("Question")
