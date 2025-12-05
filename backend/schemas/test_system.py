from pydantic import BaseModel, Field, UUID4
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Shared / Base Schemas ---

class TestBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int = 60
    meta: Optional[Dict[str, Any]] = None

class QuestionBase(BaseModel):
    q_type: str = "coding"

# --- Create Schemas ---

class TestCreate(TestBase):
    recruiter_id: int # Changed to int

class QuestionCreate(QuestionBase):
    # Plain text payloads for creation (will be encrypted by backend)
    title: str
    description: str
    constraints: Optional[str] = ""
    examples: Optional[List[Dict[str, Any]]] = []
    sample_tests: Optional[List[Dict[str, Any]]] = []
    hidden_tests: Optional[List[Dict[str, Any]]] = []
    canonical_solution: Optional[str] = None
    language: str = "python"
    # MCQ Fields
    options: Optional[List[str]] = []
    correct_option: Optional[int] = 0

class AssignmentCreate(BaseModel):
    test_id: UUID4
    candidate_ids: List[int] # Changed to int
    expires_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None

class SubmissionCreate(BaseModel):
    question_id: UUID4
    language: str
    code: str

class ProctorLogCreate(BaseModel):
    event_type: str
    payload: Optional[Dict[str, Any]] = None

# --- Response Schemas ---

class QuestionPublic(QuestionBase):
    id: UUID4
    # Only public info
    title: str
    description: str
    constraints: Optional[str] = ""
    examples: Optional[List[Dict[str, Any]]] = []
    sample_tests: Optional[List[Dict[str, Any]]] = []
    # MCQ Fields
    options: Optional[List[str]] = []
    # NO hidden tests here

class TestPublic(TestBase):
    id: UUID4
    created_at: datetime
    questions: List[QuestionPublic] = []

class TestSummary(TestBase):
    id: UUID4
    created_at: datetime
    # No questions field, or optional empty list
    questions_count: int = 0 # Optional: add count instead of full list

class AssignmentPublic(BaseModel):
    id: UUID4
    test: TestPublic
    status: str
    starts_at: Optional[datetime]
    expires_at: Optional[datetime]
    scheduled_at: Optional[datetime]
    candidate_id: int 
    score: Optional[float]
    proctor_logs: List[Dict[str, Any]] = []

class SubmissionResult(BaseModel):
    id: UUID4
    status: str
    grading_status: Optional[str] = "completed"
    execution_summary: Optional[Dict[str, Any]]
    score: Optional[float]

class RecruiterTestDetail(TestPublic):
    pass

class RecruiterAssignmentDetail(AssignmentPublic):
    pass
