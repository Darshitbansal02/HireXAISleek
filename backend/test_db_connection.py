import sys
import os

# Add the current directory to sys.path so we can import from core
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import SessionLocal
from sqlalchemy import text

def test_connection():
    print("Testing database connection...")
    try:
        db = SessionLocal()
        # Try a simple query
        result = db.execute(text("SELECT 1"))
        print("Database connection successful!")
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    success = test_connection()
    if not success:
        sys.exit(1)
