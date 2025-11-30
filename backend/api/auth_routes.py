from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from core.database import get_db
from models import User
from core.security import hash_password, verify_password
from core.auth import create_access_token   # ✅ FIXED IMPORT
from core.config import settings

router = APIRouter()

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ''
    role: str = 'candidate'  # candidate/recruiter/admin

class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post('/register')
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail='User already exists')

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({'sub': user.email, 'role': user.role, 'id': user.id})
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': {'email': user.email, 'id': user.id, 'role': user.role}
    }


@router.post('/login')
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail='Invalid credentials')

    token = create_access_token({'sub': user.email, 'role': user.role, 'id': user.id})
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': {'email': user.email, 'id': user.id, 'role': user.role}
    }
