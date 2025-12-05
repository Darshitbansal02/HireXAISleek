import os
from dotenv import load_dotenv
from supabase import create_client
import sys

# Try loading from .env
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(dotenv_path):
    print(f"Loading env from {dotenv_path}")
    load_dotenv(dotenv_path)
else:
    print("No .env file found in backend directory")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "resumes")

print(f"URL: {url}")
# Mask key for security
print(f"Key: {key[:5]}...{key[-5:] if key else ''}")
print(f"Bucket: {bucket}")

if not url or not key:
    print("Missing SUPABASE_URL or SUPABASE_KEY")
    sys.exit(1)

try:
    client = create_client(url, key)
    print("Client created.")
    
    # List Buckets
    print("Listing buckets...")
    res = client.storage.list_buckets()
    print(f"Buckets found: {[b.name for b in res]}")
    
    # Check specifically for our bucket
    found = any(b.name == bucket for b in res)
    if not found:
        print(f"ERROR: Bucket '{bucket}' NOT FOUND!")
        # Try creating it?
        # client.storage.create_bucket(bucket)
    else:
        print(f"Bucket '{bucket}' exists.")
        
        # Try a test upload
        print("Attempting test upload...")
        try:
            res = client.storage.from_(bucket).upload("debug_test.txt", b"Hello World", {"content-type": "text/plain", "upsert": "true"})
            print(f"Upload successful: {res}")
        except Exception as e:
            print(f"Upload FAILED: {e}")

except Exception as e:
    print(f"Connection FAILED: {e}")
