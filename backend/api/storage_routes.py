from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
import os, shutil
from core.database import get_db
from models import Resume, User
from sqlalchemy.orm import Session
from core.auth import get_current_active_user

router = APIRouter()
UPLOAD_DIR = os.path.join(os.getcwd(), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post('/upload-resume')
async def upload_resume(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    filename = f"{current_user.id}_{file.filename}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, 'wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    # save record
    resume = Resume(user_id=current_user.id, filename=filename, filepath=path)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return {'message': 'Uploaded', 'resume_id': resume.id}