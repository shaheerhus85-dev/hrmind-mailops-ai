from fastapi import FastAPI

from app.api.routes import api_router
from app.core.config import settings
from app.schemas import HealthResponse


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Backend foundation for the HRMind MailOps product demo. "
        "No Gmail sending, AI classification, or RAG indexing is active."
    ),
)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        database_configured=bool(settings.database_url),
        safety={
            "gmail_connected": False,
            "email_sending_enabled": False,
            "ai_enabled": False,
            "rag_indexing_enabled": False,
        },
    )
