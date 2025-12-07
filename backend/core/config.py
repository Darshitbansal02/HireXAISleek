import os
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Calculate absolute path to .env file in backend directory
current_file_dir = os.path.dirname(os.path.abspath(__file__))
# We want .../backend/.env
env_path = os.path.join(os.path.dirname(current_file_dir), ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "HireXAI"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # development or production
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = []
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
        
        # Fallback to SQLite for development if no production URL configured
        print("[WARNING] No Supabase or PostgreSQL URL found. Using SQLite for development.")
        return "sqlite:///./hirexai.db"

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

    # Test System Configuration
    TESTS_AES_KEY: Optional[str] = None
    JUDGE0_API_URL: str = "https://judge0-ce.p.rapidapi.com"
    JUDGE0_API_KEY: Optional[str] = None

    # Supabase Configuration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_STORAGE_BUCKET: str = "resumes"

    # File Uploads (Deprecated: local storage)
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB

    model_config = SettingsConfigDict(env_file=env_path, case_sensitive=True, extra="ignore")

settings = Settings()

# Debug Logging
print(f"[DEBUG] Loading config from: {env_path}")
print(f"[DEBUG] GROQ_API_KEY Loaded: {bool(settings.GROQ_API_KEY)}")
print(f"[DEBUG] TESTS_AES_KEY Loaded: {bool(settings.TESTS_AES_KEY)}")

if not settings.TESTS_AES_KEY:
    print("[WARNING] TESTS_AES_KEY not found in .env. Generating a temporary one for dev.")
    import secrets
    import base64
    # Generate 32 random bytes and base64 encode them
    settings.TESTS_AES_KEY = base64.b64encode(secrets.token_bytes(32)).decode('utf-8')