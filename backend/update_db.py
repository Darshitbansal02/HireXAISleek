import os
from dotenv import load_dotenv

load_dotenv()

# -------------------------------------------------
# 🔧 1. PASTE YOUR SUPABASE DETAILS HERE
# -------------------------------------------------
SUPABASE_API_URL = os.getenv("SUPABASE_API_URL")
SUPABASE_PROJECT_ID = os.getenv("SUPABASE_PROJECT_ID")
SUPABASE_PASSWORD = os.getenv("SUPABASE_PASSWORD")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")
# -------------------------------------------------


def check_env():
    print("\n🔍 Checking Config Values...\n")

    print("SUPABASE_API_URL:", "OK" if SUPABASE_API_URL else "MISSING")
    print("SUPABASE_PROJECT_ID:", "OK" if SUPABASE_PROJECT_ID else "MISSING")
    print("SUPABASE_DB_URL:", "OK" if SUPABASE_DB_URL else "MISSING")
    print("SUPABASE_PASSWORD:", "OK" if SUPABASE_PASSWORD else "MISSING")


def test_postgres():
    print("\n🔍 Testing Supabase Postgres...\n")

    try:
        conn = psycopg2.connect(SUPABASE_DB_URL, sslmode="require")
        cur = conn.cursor()
        cur.execute("SELECT NOW();")
        print("✅ Connected to Supabase Postgres. Server Time:", cur.fetchone())

        cur.close()
        conn.close()
    except Exception as e:
        print("❌ Postgres FAILED:")
        print(e)


def test_api():
    print("\n🔍 Testing Supabase API...\n")

    try:
        url = f"{SUPABASE_API_URL}/"
        res = requests.get(url)

        if res.status_code in [200, 301, 302, 404]:
            print("✅ Supabase API reachable! Status:", res.status_code)
        else:
            print("⚠️ API responded with:", res.status_code)

    except Exception as e:
        print("❌ API FAILED:")
        print(e)


if __name__ == "__main__":
    check_env()
    test_postgres()
    test_api()
