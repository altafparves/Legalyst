from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, business_profile, health, v1

settings = get_settings()

app = FastAPI(
    title="Legalyst API",
    version="1.0.0",
    description=(
        "AI-Powered Regulatory Compliance Copilot for Indonesian F&B and Retail MSMEs. "
        "Provides KBLI 2025 semantic profiling, persisted business profiles, "
        "grounded RAG compliance checklists with Day 8 track cutoff flags, and PDF draft generation."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(business_profile.router)
app.include_router(v1.router)
