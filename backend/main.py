from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import socketio
from core.config import settings
from core.logging import get_logger
from core.exceptions import AuthError, PermissionDeniedError, NotFoundError, ValidationError, LLMError
from api.v1 import auth, candidate, recruiter, notifications, resume_builder
from api import search_routes, llm_routes

logger = get_logger()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Auto-create tables (Removes need for manual Alembic migrations in dev)
from core.database import Base, engine
from models.user import User
from models.job import Job
from models.application import Application
from models.resume import Resume
from models.candidate_profile import CandidateProfile
from models.saved_job import SavedJob
from models.shortlisted_candidate import ShortlistedCandidate
from models.scheduled_event import ScheduledEvent
from models.test_system import Test, TestQuestion, TestAssignment, ProctorLog, Submission
from models.interview import InterviewSession
Base.metadata.create_all(bind=engine)

# CORS Middleware
print(f"[DEBUG] BACKEND_CORS_ORIGINS found in settings: {settings.BACKEND_CORS_ORIGINS}")
origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]

# Fallback if no origins defined
if not origins:
    print("[WARNING] No BACKEND_CORS_ORIGINS defined in .env. CORS may block requests.")
print(f"[DEBUG] Allowed Origins for CORS: {origins}")

# Ensure localhost is always allowed (critical for local dev accessing ngrok backend)
if "http://localhost:3000" not in origins:
    origins.append("http://localhost:3000")
if "http://127.0.0.1:3000" not in origins:
    origins.append("http://127.0.0.1:3000")

# Environment-based CORS configuration
allow_origin_regex = None
if settings.ENVIRONMENT == "development":
    allow_origin_regex = r"https://.*\.ngrok-free\.app"  # Allow ngrok in dev only
else:
    print("[WARNING] ngrok origins disabled in production")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    # Include common custom headers used by the frontend (ngrok helper, X-Requested-With, etc.)
    # Keep this list explicit in production; for local/dev you can relax to ['*'] if needed.
    allow_headers=[
        "Content-Type",
        "Authorization",
        "ngrok-skip-browser-warning",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
)

# Global Exception Handlers
@app.exception_handler(AuthError)
async def auth_exception_handler(request: Request, exc: AuthError):
    logger.warning(f"Auth error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": "Authentication Failed", "details": exc.detail},
    )

@app.exception_handler(PermissionDeniedError)
async def permission_exception_handler(request: Request, exc: PermissionDeniedError):
    logger.warning(f"Permission denied: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": "Permission Denied", "details": exc.detail},
    )

@app.exception_handler(NotFoundError)
async def not_found_exception_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": "Not Found", "details": exc.detail},
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": "Validation Error", "details": exc.detail},
    )

@app.exception_handler(LLMError)
async def llm_exception_handler(request: Request, exc: LLMError):
    logger.error(f"LLM error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": "AI Service Unavailable", "details": exc.detail},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Fix: Use unsafe=True or catch formatting errors for loguru with SQL params in errors
    try:
        logger.error(f"Unhandled exception: {exc}")
    except KeyError:
        # Fallback if loguru fails to format message with braces (e.g. SQL params)
        logger.error("Unhandled exception occurred (message formatting failed)")
        logger.exception(exc)
    
    # Don't expose exception details in production
    detail = str(exc) if settings.ENVIRONMENT == "development" else "Internal server error"
    
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal Server Error", "details": detail},
    )

# Include Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(candidate.router, prefix="/api/v1/candidate", tags=["Candidate"])
app.include_router(recruiter.router, prefix=f"{settings.API_V1_STR}/recruiter", tags=["Recruiter"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["Notifications"])
# app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(llm_routes.router, prefix="/api/v1/llm", tags=["LLM"])
app.include_router(resume_builder.router, prefix="/api/v1/resume_builder", tags=["Resume Builder"])

from api import dashboard_routes, search_routes
app.include_router(dashboard_routes.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])
app.include_router(search_routes.router, prefix=f"{settings.API_V1_STR}/search", tags=["Search"])

# New Features
from api.v1 import interview #, test_workflow
app.include_router(interview.router, prefix=f"{settings.API_V1_STR}/interview", tags=["Interview"])
# app.include_router(test.router, prefix=f"{settings.API_V1_STR}/test", tags=["Test"]) # Deprecated simple test
# app.include_router(test_workflow.router, prefix=f"{settings.API_V1_STR}/test-workflow", tags=["Test Workflow"])

# Test System (New)
from api.routers import tests, assignments, proctoring
app.include_router(tests.router, prefix=f"{settings.API_V1_STR}/recruiter/tests", tags=["Recruiter Tests"])
app.include_router(assignments.router, prefix=f"{settings.API_V1_STR}/candidate/assignments", tags=["Candidate Assignments"])
app.include_router(assignments.recruiter_router, prefix=f"{settings.API_V1_STR}/recruiter/assignments", tags=["Recruiter Assignments"])
app.include_router(proctoring.router, prefix=f"{settings.API_V1_STR}/proctoring", tags=["Proctoring"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to HireXAI API",
        "docs": f"{settings.API_V1_STR}/docs",
        "version": "2.0.0"
    }

@app.get("/health")
@app.get("/api/health")
async def health():
    """Health check endpoint - indicates server is running and ready"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "socketio": "enabled"
    }

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 HireXAI Backend Started Successfully")
    logger.info("📡 Socket.IO server initialized")
    # Initialize Supabase storage client
    from core.storage import init_supabase
    init_supabase()

# Import Socket.IO instance - WRAP AFTER ALL MIDDLEWARE AND ROUTES ARE CONFIGURED
from sio import sio

# IMPORTANT: This must be the last line - it wraps the FastAPI app with Socket.IO
# The Socket.IO server will handle /socket.io/* paths
# All other paths go to FastAPI
app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path='socket.io'  # Explicitly set the Socket.IO path
)