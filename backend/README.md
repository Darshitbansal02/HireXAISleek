# HireXAI Full Backend

This project is a ready-to-run FastAPI backend for HireXAI.

## Setup

1. Create a virtualenv and install requirements:

```bash
pip install -r requirements.txt
```

2. Set environment variables (create a .env):

```
OPENAI_API_KEY=your_key_here
DATABASE_URL=sqlite:///./hirexai.db
JWT_SECRET=supersecret
```

3. Run server:

```bash
uvicorn main:app --reload
```

4. API docs: http://localhost:8000/docs

