import uuid
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text, JSON, Float, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base

class Test(Base):
    __tablename__ = "tests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recruiter_id = Column(Integer, nullable=False) # Changed to Integer
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, default=60)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    questions = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan")
    assignments = relationship("TestAssignment", back_populates="test", cascade="all, delete-orphan")

class TestQuestion(Base):
    __tablename__ = "test_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    test_id = Column(UUID(as_uuid=True), ForeignKey("tests.id", ondelete="CASCADE"))
    q_type = Column(String, default="coding")
    encrypted_problem_payload = Column(LargeBinary, nullable=False)
    encrypted_hidden_tests_payload = Column(LargeBinary, nullable=False)
    
    test = relationship("Test", back_populates="questions")
    submissions = relationship("Submission", back_populates="question")

class TestAssignment(Base):
    __tablename__ = "test_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    test_id = Column(UUID(as_uuid=True), ForeignKey("tests.id", ondelete="CASCADE"))
    candidate_id = Column(Integer, nullable=False) # Changed to Integer
    recruiter_id = Column(Integer, nullable=True) # Changed to Integer
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    starts_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="pending") # pending, started, completed, expired
    attempt_count = Column(Integer, default=0)
    meta = Column(JSON, nullable=True)

    test = relationship("Test", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")
    proctor_logs = relationship("ProctorLog", back_populates="assignment")
    proctor_logs = relationship("ProctorLog", back_populates="assignment")
    # webcam_snapshots removed for privacy compliance

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("test_assignments.id", ondelete="CASCADE"))
    question_id = Column(UUID(as_uuid=True), ForeignKey("test_questions.id"))
    language = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    execution_summary = Column(JSON, nullable=True) # Verdict, output, etc.
    score = Column(Float, default=0.0)
    grading_status = Column(String, default="queued") # queued, processing, completed, error
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("TestAssignment", back_populates="submissions")
    question = relationship("TestQuestion", back_populates="submissions")

class ProctorLog(Base):
    __tablename__ = "proctor_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("test_assignments.id", ondelete="CASCADE"), nullable=True)
    interview_room_id = Column(String, ForeignKey("interview_sessions.room_id", ondelete="CASCADE"), nullable=True)
    severity = Column(String(10), nullable=False, default='LOW')
    event_type = Column(String, nullable=False) # tab_switch, fullscreen_exit, etc.
    payload = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("TestAssignment", back_populates="proctor_logs")
    interview_session = relationship("InterviewSession", foreign_keys=[interview_room_id])
