from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=["backend/.env", ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "SwasthyaVaani API"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "*",
    ]

    # Security
    SECRET_KEY: str = "swasthyavaani-dev-secret-key-32-chars-minimum-secure"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = "sqlite:///./swasthyavaani.db"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "medical-documents"

    # Private document processing
    DOCUMENT_STORAGE_DIR: str = "./private_uploads"
    DOCUMENT_MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024
    DOCUMENT_MAX_PAGE_COUNT: int = 20
    DOCUMENT_ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/png",
        "image/jpeg",
    ]

    # AI & Speech Providers
    PROVIDER_LLM: str = "mock"
    LLM_PROVIDER: str = "mock"
    PROVIDER_SPEECH: str = "mock"
    PROVIDER_OCR: str = "mock"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_DOCUMENT_MODEL: str = "gemini-3.5-flash-lite"
    DOCUMENT_EXTRACTOR_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_DOCUMENT_MODEL: str = "qwen/qwen3.8-27b"
    SARVAM_API_KEY: str = ""
    BHASHINI_API_KEY: str = ""
    BHASHINI_USER_ID: str = ""

    # Interview Safety Guardrail Defaults
    MAX_QUESTIONS_DEFAULT: int = 10
    MAX_CONSECUTIVE_LOW_PROGRESS: int = 2


settings = Settings()
