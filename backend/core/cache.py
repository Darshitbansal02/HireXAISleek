"""
Supabase-based caching service.
Replaces Redis with PostgreSQL table for caching.
"""
import json
from datetime import datetime, timedelta
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.logging import get_logger

logger = get_logger()


class SupabaseCache:
    """
    Simple caching layer using Supabase PostgreSQL.
    Suitable for caching LLM responses, embeddings, and other expensive operations.
    """

    def __init__(self, db: Session):
        self.db = db

    def get(self, key: str) -> Optional[Any]:
        """
        Get a cached value by key.
        Returns None if key doesn't exist or is expired.
        """
        try:
            result = self.db.execute(
                text("SELECT value FROM cache WHERE key = :key AND expires_at > NOW()"),
                {"key": key}
            ).fetchone()
            
            if result:
                return result[0]  # JSONB automatically parsed
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> bool:
        """
        Set a cached value with TTL (time-to-live).
        Default TTL is 1 hour.
        """
        try:
            expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
            
            self.db.execute(
                text("""
                    INSERT INTO cache (key, value, expires_at)
                    VALUES (:key, :value, :expires_at)
                    ON CONFLICT (key) DO UPDATE 
                    SET value = :value, expires_at = :expires_at
                """),
                {
                    "key": key,
                    "value": json.dumps(value),
                    "expires_at": expires_at
                }
            )
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            self.db.rollback()
            return False

    def delete(self, key: str) -> bool:
        """
        Delete a cached value.
        """
        try:
            self.db.execute(
                text("DELETE FROM cache WHERE key = :key"),
                {"key": key}
            )
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            self.db.rollback()
            return False

    def exists(self, key: str) -> bool:
        """
        Check if a key exists and is not expired.
        """
        try:
            result = self.db.execute(
                text("SELECT 1 FROM cache WHERE key = :key AND expires_at > NOW()"),
                {"key": key}
            ).fetchone()
            return result is not None
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False

    def cleanup_expired(self) -> int:
        """
        Remove all expired cache entries.
        Returns the number of entries removed.
        """
        try:
            result = self.db.execute(
                text("DELETE FROM cache WHERE expires_at < NOW()")
            )
            self.db.commit()
            deleted = result.rowcount
            logger.info(f"Cleaned up {deleted} expired cache entries")
            return deleted
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")
            self.db.rollback()
            return 0


def get_cache(db: Session) -> SupabaseCache:
    """
    Factory function to get a cache instance.
    """
    return SupabaseCache(db)


# Cache key generators for common use cases
def make_embedding_key(text: str) -> str:
    """Generate cache key for text embeddings."""
    import hashlib
    text_hash = hashlib.md5(text.encode()).hexdigest()
    return f"embedding:{text_hash}"


def make_llm_response_key(prompt: str, model: str = "default") -> str:
    """Generate cache key for LLM responses."""
    import hashlib
    prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
    return f"llm:{model}:{prompt_hash}"


def make_search_key(query: str, search_type: str = "candidates") -> str:
    """Generate cache key for search results."""
    import hashlib
    query_hash = hashlib.md5(query.encode()).hexdigest()
    return f"search:{search_type}:{query_hash}"
