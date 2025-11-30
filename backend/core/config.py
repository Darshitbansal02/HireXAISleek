import os
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# --- FIX: Calculate Absolute Path to Root Database ---
# 1. Get location of this file (backend/core/config.py)
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# 2. Go up two levels to Root (D:\HireXAISleek)
root_dir = os.path.dirname(os.path.dirname(current_file_dir))
# 3. Create absolute path to DB
db_path = os.path.join(root_dir, "hirexai.db")
# 4. Create the connection string
ROOT_DATABASE_URL = f"sqlite:///{db_path}"

print(f"[INFO] CONFIG LOADED: Connecting to database at -> {ROOT_DATABASE_URL}")

# Calculate absolute path to .env file in backend directory
# current_file_dir is .../backend/core
# We want .../backend/.env
env_path = os.path.join(os.path.dirname(current_file_dir), ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "HireXAI"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"]
    # Database
    SUPABASE_DB_URL: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_url(cls, v: Optional[str], info: any) -> str:
        # Prioritize Supabase URL from env
        supabase_url = info.data.get("SUPABASE_DB_URL")
        
        # If not in info.data, check if it was passed as v (if DATABASE_URL env var is set)
        if not supabase_url and isinstance(v, str) and (v.startswith("postgres://") or v.startswith("postgresql://")):
             supabase_url = v

        if supabase_url:
            # Ensure using postgresql driver
            if supabase_url.startswith("postgres://"):
                return supabase_url.replace("postgres://", "postgresql://", 1)
            return supabase_url
        return v or ROOT_DATABASE_URL

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        elif isinstance(v, list):
            return v
        raise ValueError(v)
    
    # Security
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_CHANGE_THIS_IN_PROD"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # LLM Configuration
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # File Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB

    model_config = SettingsConfigDict(env_file=env_path, case_sensitive=True, extra="ignore")

settings = Settings()