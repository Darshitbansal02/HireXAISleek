from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from services.openai_service import optimize_resume, generate_resume_text, get_embedding
from services.search_service import upsert_embedding_for_resume, semantic_search_candidates
from core.auth import get_current_user, get_current_active_user
from core.database import get_db
from sqlalchemy.orm import Session

router = APIRouter()

class ResumeRequest(BaseModel):
    resume_text: str

class BuildResumeRequest(BaseModel):
    name: str
    email: str
    education: str = ''
    experience: str = ''
    skills: str = ''

@router.post('/optimize-resume')
async def optimize(data: ResumeRequest):
    try:
        optimized = await optimize_resume(data.resume_text)
        return {'optimized_resume': optimized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/build-resume')
async def build_resume(data: BuildResumeRequest):
    try:
        content = await generate_resume_text(data.dict())
        return {'resume_text': content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/embed-resume/{resume_id}')
async def embed_resume(resume_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # create or update embedding for a resume and store vector in DB (and optionally local index)
    try:
        background_tasks.add_task(upsert_embedding_for_resume, resume_id, db)
        return {'message': 'Embedding task scheduled'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/search-candidates')
async def search_candidates(query: dict, db: Session = Depends(get_db)):
    # query = {'text': 'Backend Python Developer, 3+ years, remote India'}
    text = query.get('text') if isinstance(query, dict) else None
    if not text:
        raise HTTPException(status_code=400, detail='Provide text in request body')
    results = await semantic_search_candidates(text, db)
    return {'results': results}