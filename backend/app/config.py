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


@lru_cache
def get_settings() -> Settings:
    return Settings()
