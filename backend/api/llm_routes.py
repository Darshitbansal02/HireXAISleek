from fastapi import APIRouter, HTTPException, Depends
from core.database import get_db
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from services.llm_service import llm_service
from core.auth import get_current_user
from models.user import User

router = APIRouter()

class GenerateRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = None
    max_tokens: int = 512
    temperature: float = 0.2

class GenerateResponse(BaseModel):
    provider: str
    text: str
    response: str  # Alias for frontend compatibility

@router.post("/generate", response_model=GenerateResponse)
async def generate_text(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = await llm_service.generate(
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        # Add 'response' field for frontend compatibility
        result["response"] = result["text"]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AnalyzeResumeRequest(BaseModel):
    resume_text: str

@router.post("/analyze-resume")
async def analyze_resume(
    request: AnalyzeResumeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        system_prompt = """You are an expert Career Coach and Resume Doctor with 15+ years of experience in HR and recruitment. 
        Your goal is to analyze resumes and provide critical, actionable feedback to help candidates land their dream jobs.
        
        Analyze the provided resume text and return a JSON response with the following structure:
        {
            "match_score": number (0-100),
            "ats_compatibility": "Low" | "Medium" | "High",
            "summary": "Brief professional summary of the candidate",
            "strengths": ["strength 1", "strength 2", ...],
            "weaknesses": ["weakness 1", "weakness 2", ...],
            "missing_keywords": ["keyword 1", "keyword 2", ...],
            "improvements": ["specific actionable advice 1", "advice 2", ...]
        }
        
        Focus on:
        1. Impact and metrics (Did they achieve X? By how much?)
        2. Clarity and formatting (Is it easy to read?)
        3. Industry-relevant keywords (ATS optimization)
        4. Active voice and strong action verbs
        
        Be honest but constructive. If the resume is poor, say so but explain how to fix it."""

        result = await llm_service.generate(
            prompt=f"Here is the resume content to analyze:\n\n{request.resume_text}",
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=2500  # Increased to ensure complete JSON response
        )
        
        # Parse and save to DB
        import json
        from models.candidate_profile import CandidateProfile
        
        analysis_text = result["text"]
        
        # Try to extract JSON if wrapped in code blocks
        json_str = analysis_text
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0].strip()
            
        try:
            analysis_json = json.loads(json_str)
            
            # Save to profile
            profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
            if profile:
                profile.resume_analysis = analysis_json
                profile.resume_score = analysis_json.get("match_score", 0)
                profile.resume_summary = analysis_json.get("summary", "")
                db.commit()
                
        except Exception as e:
            print(f"Failed to parse/save analysis JSON: {e}")
            # Still return the text so frontend can try to display something
        
        return {"analysis": result["text"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
