import os
os.environ["SWASTHYAVAANI_IN_TEST"] = "1"
import pytest
from fastapi.testclient import TestClient

# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker

# pyrefly: ignore [missing-import]
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app
from app.services.providers.factory import provider_registry

# Create in-memory SQLite database for deterministic test runs
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def deterministic_provider_settings(monkeypatch):
    monkeypatch.setattr(settings, "PROVIDER_LLM", "mock")
    monkeypatch.setattr(settings, "PROVIDER_SPEECH", "mock")
    monkeypatch.setattr(settings, "PROVIDER_OCR", "mock")
    monkeypatch.setattr(settings, "EMBEDDING_PROVIDER", "mock")
    monkeypatch.setattr(settings, "MAX_QUESTIONS_DEFAULT", 10)
    provider_registry._llm_provider = None
    provider_registry._speech_provider = None
    provider_registry._ocr_provider = None
    provider_registry._embedding_provider = None
    yield
    provider_registry._llm_provider = None
    provider_registry._speech_provider = None
    provider_registry._ocr_provider = None
    provider_registry._embedding_provider = None


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    def build(role: str) -> dict[str, str]:
        token = create_access_token(
            {"sub": f"test-{role.lower()}", "role": role, "name": f"Test {role}"}
        )
        return {"Authorization": f"Bearer {token}"}

    return build
