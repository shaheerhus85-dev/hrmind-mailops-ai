from functools import lru_cache
import os

from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


def read_csv_env(name: str, fallback: list[str]) -> list[str]:
    value = os.getenv(name)
    if not value:
        return fallback
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseModel):
    app_name: str = "HRMind MailOps API"
    app_version: str = "0.2.0"
    environment: str = os.getenv("BACKEND_ENV", os.getenv("APP_ENV", "development"))
    database_url: str | None = os.getenv("DATABASE_URL")
    jwt_secret: str | None = os.getenv("JWT_SECRET")
    jwt_expires_minutes: int = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))
    api_prefix: str = "/api"
    cors_origins: list[str] = read_csv_env(
        "BACKEND_CORS_ORIGINS",
        [
            "http://localhost:3000",
            "https://hrmind-mailops-ai.vercel.app",
        ],
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

if settings.environment.lower() in {"production", "prod"} and not settings.jwt_secret:
    raise RuntimeError("JWT_SECRET must be configured in production.")
