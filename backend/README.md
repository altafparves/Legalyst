# Legalyst backend

FastAPI service. Python 3.11+.

## Local setup

```bash
cd backend
python3 -m venv .venv
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

## Config

All configuration is read from environment variables (see `.env.example`) — nothing is hardcoded. `APP_ENV`, `CORS_ORIGINS`, and `DATABASE_URL` are loaded in `app/config.py`.

## Lint

```bash
ruff check .
```
