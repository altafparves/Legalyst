"""Unit tests for /health and /health/db endpoints (#73)."""

from fastapi.testclient import TestClient

from app.deps import get_db
from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_health_db_executes_select_1():
    res = client.get("/health/db")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "database": "ok"}


def test_health_db_returns_503_when_database_fails():
    class BrokenSession:
        def execute(self, *args, **kwargs):
            raise RuntimeError("connection refused")

    def override_broken_db():
        yield BrokenSession()

    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_broken_db
    try:
        res = client.get("/health/db")
        assert res.status_code == 503
        assert "Database unreachable" in res.json()["detail"]
    finally:
        if previous is not None:
            app.dependency_overrides[get_db] = previous
        else:
            app.dependency_overrides.pop(get_db, None)
