from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from core.config import settings
from core.exceptions import AuthError, PermissionDeniedError
from core.database import get_db
from models.user import User
from services.user_service import UserService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise AuthError("Invalid token")
            
    except JWTError:
        raise AuthError("Could not validate credentials")
        
    user = UserService.get_user_by_id(db, int(user_id))
    if not user:
        raise AuthError("User not found")
        
    if not user.is_active:
        raise AuthError("Inactive user")
        
    return user

def require_role(role: str):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role != role and current_user.role != "admin":
            raise PermissionDeniedError(f"Role {role} required")
        return current_user
    return role_checker

def require_candidate(current_user: User = Depends(get_current_user)):
    if current_user.role != "candidate" and current_user.role != "admin":
        raise PermissionDeniedError("Candidate role required")
    return current_user

def require_recruiter(current_user: User = Depends(get_current_user)):
    if current_user.role != "recruiter" and current_user.role != "admin":
        raise PermissionDeniedError("Recruiter role required")
    return current_user

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise PermissionDeniedError("Admin role required")
    return current_user
