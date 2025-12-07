import socket
import sys
import uvicorn
import os
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

HOST = os.getenv("HOST", "0.0.0.0") # Default to all interfaces for container/render compatibility
PORT = int(os.getenv("PORT", "8000"))

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0

if __name__ == "__main__":
    if is_port_in_use(PORT):
        print(f"❌ Port {PORT} is already in use. Not starting another Uvicorn instance.")
        sys.exit(1)

    print(f"🚀 Starting Uvicorn on {HOST}:{PORT}")
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,       # Works now with safe entrypoint
        reload_dirs=[".."] # Optional: watch parent project
    )
