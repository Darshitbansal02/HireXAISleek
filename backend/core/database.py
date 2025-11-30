from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

# Configure engine based on database type
connect_args = {}
pool_pre_ping = True  # Enable connection health checks

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    pool_pre_ping = True
elif settings.DATABASE_URL.startswith("postgresql"):
    # Supabase-specific SSL configuration
    connect_args = {
        "connect_timeout": 10,
        "options": "-c timezone=utc"
    }

engine = create_engine(
    settings.DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=pool_pre_ping,  # Test connections before using them
    pool_size=5,  # Connection pool size (adjust based on your needs)
    max_overflow=10,  # Max overflow connections
    pool_recycle=3600,  # Recycle connections after 1 hour (important for Supabase)
    echo=False  # Set to True for SQL query debugging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
