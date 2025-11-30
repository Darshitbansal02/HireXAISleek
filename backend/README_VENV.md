# HireXAISleek Backend - Virtual Environment Setup

## ⚠️ Important: Always Use .venv

The backend must **ALWAYS** be run in the virtual environment (`.venv`) to ensure correct dependencies are used.

## Quick Start

### 1. Activate Virtual Environment

```powershell
# From project root (d:\HireXAISleek)
.venv\Scripts\Activate.ps1
```

You should see `(.venv)` in your terminal prompt.

### 2. Start Backend Server

```powershell
cd backend
uvicorn main:app --reload
```

The server will start at: `http://127.0.0.1:8000`

## First-Time Setup

If you need to recreate or reset the virtual environment:

```powershell
# 1. Create virtual environment
python -m venv .venv

# 2. Activate it
.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r backend\requirements.txt
```

## Verifying Installation

Check that all dependencies are installed correctly:

```powershell
# Activate .venv first!
.venv\Scripts\Activate.ps1

# Check installed packages
pip list | findstr "fastapi httpx pydantic"
```

You should see:
- `fastapi`
- `httpx`
- `pydantic`
- `pydantic-settings`

## Common Commands

```powershell
# Start backend (with auto-reload)
uvicorn main:app --reload

# Start backend (production mode, no reload)  
uvicorn main:app

# Install new dependency
pip install package-name
pip freeze > requirements.txt  # Update requirements

# Deactivate virtual environment
deactivate
```

## Troubleshooting

### Error: "ModuleNotFoundError: No module named 'pydantic_set tings'"

**Solution**: Activate `.venv` first!
```powershell
.venv\Scripts\Activate.ps1
pip install pydantic-settings
```

### Error: "Port 8000 already in use"

**Solution**: Find and kill the process
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F
```

### Error: "Cannot activate .venv"

**Solution**: Execution policy issue
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Environment Variables

Required environment variables in `.env`:

```
# AI Providers (at least one required)
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here  # Optional

# Database
DATABASE_URL=sqlite:///./hirexai.db

# Security
SECRET_KEY=your-secret-key-here
```

## Automatic Activation (Optional)

Create a batch file `start-backend.bat` in project root:

```batch
@echo off
call .venv\Scripts\activate.bat
cd backend
uvicorn main:app --reload
```

Then just double-click or run: `.\start-backend.bat`
