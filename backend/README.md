# Legalyst backend

FastAPI service. Python 3.11-3.13 (SQLAlchemy 2.0.35's typing internals break on 3.14 — use `python3.12`/`python3.13` explicitly if your default `python3` resolves to 3.14).

## Local setup

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Check `GET /health` for a 200 response.

## Database

Local Postgres + pgvector runs via Docker (from the repo root):

```bash
docker compose up -d postgres
cd backend
alembic upgrade head
```

Mapped to host port `55432` (not the default 5432/5433) to avoid clashing with any Postgres you might already have installed locally — `DATABASE_URL` in `.env.example` matches. See [`docs/schema.md`](../docs/schema.md) for the ERD and table notes.

## Auth

`POST /auth/register`, `POST /auth/login`, and `GET /auth/me` (Bearer token) live in `app/routers/auth.py`. Passwords are hashed with bcrypt; tokens are signed JWTs with an expiry, set via `JWT_SECRET_KEY`/`JWT_ALGORITHM`/`JWT_EXPIRE_MINUTES` in `.env.example` — replace `JWT_SECRET_KEY`'s dev default before deploying anywhere real.

## Config

All configuration is read from environment variables (see `.env.example`) — nothing is hardcoded. `APP_ENV`, `CORS_ORIGINS`, `DATABASE_URL`, and the `JWT_*` settings are loaded in `app/config.py`.

## Lint

```bash
ruff check .
```

## Tests

```bash
pytest
```

`tests/test_auth.py` covers `/auth/register`, `/auth/login`, and `/auth/me` against an in-memory SQLite database (only the `users` table is created there, since `regulation_chunks`' `vector` column is Postgres-only).
