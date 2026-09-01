from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import SessionLocal
from app.seed.seed_data import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed initial synthetic clinical demo data if empty
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set up CORS for frontend communication (Vite / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    """Root landing endpoint providing system summary and documentation links."""
    return {
        "service": settings.PROJECT_NAME,
        "status": "ONLINE",
        "environment": settings.ENVIRONMENT,
        "documentation": "/docs",
        "health": "/health",
        "api_v1": {
            "doctor_queue": f"{settings.API_V1_STR}/doctor/queue",
            "intakes": f"{settings.API_V1_STR}/intakes",
            "hospitals": f"{settings.API_V1_STR}/admin/hospitals",
            "service_status": f"{settings.API_V1_STR}/admin/services/status"
        }
    }


@app.get("/health", tags=["Health Check"])
def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }
