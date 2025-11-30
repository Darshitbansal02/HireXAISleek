from sqlalchemy.orm import Session
from models.user import User
from models.candidate_profile import CandidateProfile
from schemas.user import UserCreate
from core.security import get_password_hash

class UserService:
    @staticmethod
    def get_user_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: int):
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def create_user(db: Session, user: UserCreate):
        hashed_password = get_password_hash(user.password)
        db_user = User(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            role=user.role,
            is_active=True
        )
        db.add(db_user)
        db.flush() # Flush to get the ID

        # Automatically create profile for candidates
        if user.role == "candidate":
            profile = CandidateProfile(
                user_id=db_user.id,
                profile_views=0,
                resume_score=0
            )
            db.add(profile)

        db.commit()
        db.refresh(db_user)
        return db_user
