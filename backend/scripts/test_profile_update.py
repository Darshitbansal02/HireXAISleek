import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# 1. Login to get token (assuming a test user exists or we can create one)
# For simplicity, I'll try to register a new user or use a known one.
# Let's assume user_id=1 exists from previous context.
# I need a token. I'll try to login with a default user if I knew one, 
# or I can try to bypass auth if I could, but I can't.
# I'll try to register a temporary user.

def get_token():
    email = "test_candidate_fix@example.com"
    password = "password123"
    
    # Try login first
    response = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    
    if response.status_code == 200:
        return response.json()["access_token"]
        
    # Register if login fails
    response = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test Candidate",
        "role": "candidate"
    })
    
    if response.status_code == 200:
        # Login again
        response = requests.post(f"{BASE_URL}/auth/login", data={
            "username": email,
            "password": password
        })
        return response.json()["access_token"]
    
    print(f"Failed to get token: {response.text}")
    return None

def test_update(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "headline": "Test Engineer",
        "experience": [
            {
                "title": "Software Engineer",
                "company": "Tech Corp",
                "start_date": "2020",
                "end_date": "Present",
                "current": True,
                "description": "Built things."
            }
        ],
        "education": [
            {
                "degree": "BS",
                "school": "University of Code",
                "year": "2019",
                "field": "Computer Science"
            }
        ]
    }
    
    print("Sending update payload...")
    response = requests.put(f"{BASE_URL}/candidate/profile", json=payload, headers=headers)
    
    if response.status_code == 200:
        print("Update successful!")
        data = response.json()
        print(f"Returned Experience: {len(data.get('experience', []))}")
        print(f"Returned Education: {len(data.get('education', []))}")
        print(f"Profile Completion: {data.get('profile_completion', {}).get('percentage')}%")
    else:
        print(f"Update failed: {response.status_code} - {response.text}")

if __name__ == "__main__":
    token = get_token()
    if token:
        test_update(token)
