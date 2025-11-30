import socket
import sys
import uvicorn

PORT = 8000

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0

if __name__ == "__main__":
    if is_port_in_use(PORT):
        print(f"❌ Port {PORT} is already in use. Not starting another Uvicorn instance.")
        sys.exit(1)

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=PORT,
        reload=True,       # Works now with safe entrypoint
        reload_dirs=[".."] # Optional: watch parent project
    )
