from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from core.database import get_db
from core.auth import require_candidate
from models.user import User
from models.resume import Resume
from schemas.resume_builder import ResumeCreate, ResumeUpdate, ResumeResponse, ResumeStructure
from services.llm_service import llm_service
from datetime import datetime
import json

router = APIRouter()

@router.post("/save", response_model=ResumeResponse)
async def save_resume(
    resume_in: ResumeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    # Check if user already has a resume
    existing_resume = db.query(Resume).filter(Resume.candidate_id == current_user.id).first()
    
    if existing_resume:
        # Update existing
        existing_resume.structured_content = resume_in.structured_content.dict()
        existing_resume.title = resume_in.title
        existing_resume.is_draft = resume_in.is_draft
        existing_resume.version += 1
        existing_resume.updated_at = datetime.utcnow()
        
        # Also update raw content for searching (simple concatenation)
        raw_text = f"{resume_in.structured_content.personal_info.full_name} "
        raw_text += f"{resume_in.structured_content.personal_info.summary} "
        for exp in resume_in.structured_content.experience:
            raw_text += f"{exp.title} {exp.company} {exp.description} "
        existing_resume.content = raw_text
        
        db.commit()
        db.refresh(existing_resume)
        return existing_resume
    else:
        # Create new
        raw_text = f"{resume_in.structured_content.personal_info.full_name} "
        raw_text += f"{resume_in.structured_content.personal_info.summary} "
        
        new_resume = Resume(
            candidate_id=current_user.id,
            title=resume_in.title,
            structured_content=resume_in.structured_content.dict(),
            content=raw_text,
            is_draft=resume_in.is_draft,
            is_primary=True # First resume is primary
        )
        db.add(new_resume)
        db.commit()
        db.refresh(new_resume)
        return new_resume

@router.get("/fetch", response_model=ResumeResponse)
async def fetch_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate)
):
    resume = db.query(Resume).filter(Resume.candidate_id == current_user.id).first()
    if not resume:
        # Return empty structure if no resume exists, frontend handles "create mode"
        return ResumeResponse(
            id=0,
            candidate_id=current_user.id,
            title="New Resume",
            structured_content=None,
            is_draft=True,
            version=0,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
    return resume

@router.post("/ai-polish")
async def ai_polish_text(
    text: str = Body(..., embed=True),
    section_type: str = Body(..., embed=True) # e.g., "experience", "summary"
):
    """
    Polishes the given text to be more professional and ATS-friendly.
    """
    if not text or len(text) < 10:
        raise HTTPException(status_code=400, detail="Text too short to polish")

    prompt = f"""
    Act as a professional resume writer. Rewrite the following {section_type} text to be more impactful, 
    action-oriented, and ATS-friendly. Use strong action verbs and quantify results where possible.
    Keep the meaning the same but improve the clarity and professionalism.
    
    Original Text:
    "{text}"
    
    Polished Text (return ONLY the polished text, no explanations):
    """
    
    try:
        response = await llm_service.generate(prompt, temperature=0.3)
        return {"polished_text": response["text"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@router.post("/ai-generate-summary")
async def ai_generate_summary(
    resume_data: ResumeStructure
):
    """
    Generates a professional summary based on the provided resume data.
    """
    # Construct context from experience and skills
    context = f"Name: {resume_data.personal_info.full_name}\n"
    context += f"Title: {resume_data.personal_info.title}\n"
    
    context += "Experience:\n"
    for exp in resume_data.experience[:3]: # Top 3 roles
        context += f"- {exp.title} at {exp.company}: {exp.description[:100]}...\n"
        
    context += "Skills:\n"
    for cat in resume_data.skills:
        context += f"- {cat.category}: {', '.join(cat.skills)}\n"
        
    prompt = f"""
    Act as a professional resume writer. Write a compelling professional summary (3-4 sentences) 
    for a resume based on the following profile. Highlight key achievements and skills.
    
    Profile:
    {context}
    
    Professional Summary (return ONLY the summary):
    """
    
    try:
        response = await llm_service.generate(prompt, temperature=0.4)
        return {"summary": response["text"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
