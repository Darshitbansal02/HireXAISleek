from supabase import create_client, Client
from core.config import settings
from typing import Optional
from core.logging import get_logger

logger = get_logger()

supabase_client: Optional[Client] = None
supabase_initialized: bool = False

def init_supabase() -> Optional[Client]:
    """Initialize Supabase client with proper error handling"""
    global supabase_client, supabase_initialized
    
    if supabase_initialized:
        return supabase_client
    
    try:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            logger.warning("[Storage] Supabase credentials not configured. File uploads disabled.")
            supabase_initialized = True
            return None
        
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        supabase_initialized = True
        logger.info("[Storage] Supabase client initialized successfully")
        return supabase_client
    except Exception as e:
        logger.error(f"[Storage] Supabase initialization failed: {e}", exc_info=True)
        supabase_initialized = True
        return None

def get_storage_client() -> Optional[Client]:
    """Get Supabase storage client, initializing if needed"""
    if not supabase_initialized:
        return init_supabase()
    return supabase_client

