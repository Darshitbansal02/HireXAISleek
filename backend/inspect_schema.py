from sqlalchemy import create_engine, inspect, text
import os

# Use the URL from the error message or try to find it. 
# The error said: sqlite:///D:\HireXAISleek\hirexai.db
# But the error also mentioned psycopg2? 
# "sqlalchemy.exc.InternalError: (psycopg2.errors.DependentObjectsStillExist)"
# This means it's Postgres!
# The sqlite log might be a default fallback or misleading log from a different run.
# I need to find the real DB URL.
# I'll check .env or config.py.
# For now, I'll try to load from backend.core.config if possible, or just check .env file.

from backend.core.config import settings

print(f"DB URL: {settings.DATABASE_URL}")

engine = create_engine(str(settings.DATABASE_URL))

inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables: {tables}")

if 'tests' in tables:
    print("\nColumns in 'tests' table:")
    for col in inspector.get_columns('tests'):
        print(col)

if 'alembic_version' in tables:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        print(f"\nCurrent Alembic Version: {result.fetchone()}")
