import requests
import random
import string

BASE_URL = "http://localhost:8000/api/v1"

def get_random_string(length=10):
    return ''.join(random.choice(string.ascii_letters) for i in range(length))

def debug_auth():
    email = f"{get_random_string()}@example.com"
    password = "password123"
    full_name = "Test Candidate"
    role = "candidate"

    print(f"Registering user: {email}")
    register_payload = {
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
        print(f"Register Status: {resp.status_code}")
        print(f"Register Response: {resp.text}")
        
        if resp.status_code != 200:
            return

        print("Logging in...")
        login_payload = {
            "username": email,
            "password": password
        }
        resp = requests.post(f"{BASE_URL}/auth/login", data=login_payload)
        print(f"Login Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"Login Response: {resp.text}")
            return

        token = resp.json()["access_token"]
        print(f"Token received: {token[:10]}...")

        print("Fetching /me...")
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print(f"Me Status: {resp.status_code}")
        print(f"Me Response: {resp.json()}")
        
        user_data = resp.json()
        if "role" in user_data:
            print(f"Role found: {user_data['role']}")
        else:
            print("ERROR: Role NOT found in response!")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    debug_auth()
