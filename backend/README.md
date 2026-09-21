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

## Config

All configuration is read from environment variables (see `.env.example`) — nothing is hardcoded. `APP_ENV` and `CORS_ORIGINS` are loaded in `app/config.py`.

## Lint

```bash
ruff check .
```
