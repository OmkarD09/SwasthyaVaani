import pytest
from fastapi.testclient import TestClient
from app.seed.seed_data import seed_database


def _headers_for(role: str | None, auth_headers) -> dict[str, str]:
    return auth_headers(role) if role else {}


@pytest.mark.parametrize(
    ("role", "expected_status"),
    [
        (None, 403),
        ("PATIENT", 403),
        ("DOCTOR", 403),
        ("ADMIN", 200),
        ("HOSPITAL_ADMIN", 200),
        ("SUPER_ADMIN", 200),
    ],
)
def test_admin_stats_role_authorization_matrix(
    client: TestClient, db, auth_headers, role: str | None, expected_status: int
):
    """Verify that unauthenticated, patient, and doctor users are rejected from /admin/stats."""
    seed_database(db)
    response = client.get("/api/v1/admin/stats", headers=_headers_for(role, auth_headers))
    assert response.status_code == expected_status


@pytest.mark.parametrize(
    ("role", "expected_status"),
    [
        (None, 403),
        ("PATIENT", 403),
        ("DOCTOR", 403),
        ("ADMIN", 200),
    ],
)
@pytest.mark.parametrize(
    "endpoint",
    [
        "/api/v1/admin/ai-monitoring",
        "/api/v1/admin/emergency-cases",
        "/api/v1/admin/audit",
        "/api/v1/admin/doctors",
        "/api/v1/admin/departments",
        "/api/v1/admin/users",
        "/api/v1/admin/services/status",
    ],
)
def test_admin_endpoints_role_authorization_matrix(
    client: TestClient, db, auth_headers, role: str | None, expected_status: int, endpoint: str
):
    """Verify that all core admin endpoints reject unauthorized callers."""
    seed_database(db)
    response = client.get(endpoint, headers=_headers_for(role, auth_headers))
    assert response.status_code == expected_status


def test_admin_endpoint_with_invalid_token_returns_401(client: TestClient, db):
    """Verify that a malformed or corrupted token returns 401."""
    seed_database(db)
    response = client.get("/api/v1/admin/stats", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert response.status_code == 401
