import os
from functools import lru_cache


class Settings:
    def __init__(self) -> None:
        self.app_env = os.environ.get("APP_ENV", "development")
        self.cors_origins = [
            origin.strip()
            for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
            if origin.strip()
        ]
        self.database_url = os.environ.get(
            "DATABASE_URL", "postgresql+psycopg://legalyst:legalyst@localhost:55432/legalyst"
        )
        self.jwt_secret_key = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
        self.jwt_algorithm = os.environ.get("JWT_ALGORITHM", "HS256")
        self.jwt_expire_minutes = int(os.environ.get("JWT_EXPIRE_MINUTES", "60"))
        self.supabase_url = os.environ.get("SUPABASE_URL", "").strip()
        self.supabase_service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        self.supabase_storage_bucket = (
            os.environ.get("SUPABASE_STORAGE_BUCKET", "generated-documents").strip()
            or "generated-documents"
        )
        # AI provider configuration (Google AI Studio primary + OpenRouter ready)
        self.llm_provider = os.environ.get("LLM_PROVIDER", "gemini").strip().lower() or "gemini"
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.gemini_embed_model = (
            os.environ.get("GEMINI_EMBED_MODEL", "gemini-embedding-001").strip()
            or "gemini-embedding-001"
        )
        self.gemini_embed_dim = int(os.environ.get("GEMINI_EMBED_DIM", "1536"))
        self.gemini_chat_model = (
            os.environ.get("GEMINI_CHAT_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
        )
        self.gemini_fallback_model = (
            os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite").strip()
            or "gemini-2.5-flash-lite"
        )
        self.openrouter_api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        self.openrouter_base_url = (
            os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip()
            or "https://openrouter.ai/api/v1"
        )
        self.openrouter_model = (
            os.environ.get("OPENROUTER_MODEL", "google/gemini-2.5-flash").strip()
            or "google/gemini-2.5-flash"
        )
        self.llm_timeout_seconds = float(os.environ.get("LLM_TIMEOUT_SECONDS", "8.0"))



@lru_cache
def get_settings() -> Settings:
    return Settings()
