from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.auth import get_current_active_user
from models import User, Job, Resume, Application

router = APIRouter()

@router.get('/stats')
def stats(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail='Forbidden')
    users = db.query(User).count()
    jobs = db.query(Job).count()
    resumes = db.query(Resume).count()
    apps = db.query(Application).count()
    return {'users': users, 'jobs': jobs, 'resumes': resumes, 'applications': apps}