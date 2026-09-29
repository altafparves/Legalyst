import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.deps import get_db
from app.main import app
from app.models import User

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_users_table():
    # Only the `users` table is created here: `regulation_chunks` uses a
    # Postgres-only `vector` column type that SQLite can't compile.
    Base.metadata.create_all(bind=engine, tables=[User.__table__])
    yield
    Base.metadata.drop_all(bind=engine, tables=[User.__table__])


def register(email: str, password: str = "password123"):
    return client.post("/auth/register", json={"email": email, "password": password})


def test_register_returns_created_user():
    response = register("newuser@example.com")
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "newuser@example.com"
    assert "hashed_password" not in body


def test_login_returns_access_token():
    register("login@example.com")
    response = client.post(
        "/auth/login", json={"email": "login@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_me_returns_current_user_with_valid_token():
    register("me@example.com")
    login_response = client.post(
        "/auth/login", json={"email": "me@example.com", "password": "password123"}
    )
    token = login_response.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_register_duplicate_email_fails():
    register("dup@example.com")
    response = register("dup@example.com")
    assert response.status_code == 400


def test_login_with_wrong_password_fails():
    register("wrongpass@example.com")
    response = client.post(
        "/auth/login", json={"email": "wrongpass@example.com", "password": "not-the-password"}
    )
    assert response.status_code == 401


def test_me_without_token_fails():
    response = client.get("/auth/me")
    assert response.status_code == 401
