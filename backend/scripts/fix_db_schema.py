import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from core.database import engine

def add_column_if_not_exists(table_name, column_name, column_type):
    with engine.connect() as conn:
        try:
            # Check if column exists
            check_sql = text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='{table_name}' AND column_name='{column_name}';
            """)
            result = conn.execute(check_sql).fetchone()
            
            if not result:
                print(f"Adding column {column_name} to {table_name}...")
                alter_sql = text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type};")
                conn.execute(alter_sql)
                conn.commit()
                print(f"Successfully added {column_name}.")
            else:
                print(f"Column {column_name} already exists in {table_name}.")
        except Exception as e:
            print(f"Error checking/adding column {column_name}: {e}")

if __name__ == "__main__":
    print("Starting schema fix...")
    add_column_if_not_exists("candidate_profiles", "resume_text", "TEXT")
    add_column_if_not_exists("candidate_profiles", "resume_summary", "TEXT")
    print("Schema fix completed.")
