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


@lru_cache
def get_settings() -> Settings:
    return Settings()
