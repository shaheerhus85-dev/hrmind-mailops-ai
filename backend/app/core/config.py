from functools import lru_cache
import os

from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


class Settings(BaseModel):
    app_name: str = "HRMind MailOps API"
    app_version: str = "0.1.0"
    environment: str = os.getenv("BACKEND_ENV", os.getenv("APP_ENV", "development"))
    database_url: str | None = os.getenv("DATABASE_URL")
    api_prefix: str = "/api"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
