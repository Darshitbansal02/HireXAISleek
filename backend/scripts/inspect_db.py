import sys
import os
from sqlalchemy import text, inspect

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import engine

def inspect_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns('candidate_profiles')
    print("Columns in candidate_profiles:")
    for column in columns:
        print(f"- {column['name']}: {column['type']}")

if __name__ == "__main__":
    inspect_schema()
