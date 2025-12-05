from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session
from supabase import create_client, Client
import uuid
import mimetypes

from core.database import get_db
from models import Resume, User
from core.auth import get_current_active_user
from core.config import settings

router = APIRouter()

# Initialize Supabase Client
supabase: Client = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

@router.post('/upload-resume')
async def upload_resume(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    if not supabase:
        raise HTTPException(status_code=500, detail="Storage service not configured (Supabase URL/Key missing)")
        
    # Validation
    if file.size and file.size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
        
    try:
        file_ext = mimetypes.guess_extension(file.content_type) or ".pdf"
        file_name = f"{current_user.id}/{uuid.uuid4()}{file_ext}"
        bucket_name = settings.SUPABASE_STORAGE_BUCKET
        
        # Read file content
        file_content = await file.read()
        
        # Upload to Supabase
        res = supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Get Public URL
        public_url_resp = supabase.storage.from_(bucket_name).get_public_url(file_name)
        # Verify the response format - get_public_url usually returns a string or object depending on version
        # In newer supabase-py versions it might be a string directly
        public_url = public_url_resp if isinstance(public_url_resp, str) else public_url_resp.public_url

        # Save record
        resume = Resume(
            candidate_id=current_user.id,  # Start using correct candidate_id
            title=file.filename,
            file_url=public_url,
            is_primary=True # Set as primary for now
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        return {
            'message': 'Uploaded successfully', 
            'resume_id': resume.id,
            'url': public_url
        }
        
    except Exception as e:
        print(f"[Storage Error] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")