from fastapi import APIRouter

from app.api.routes import (
    audit_logs,
    auth,
    candidates,
    drafts,
    email_threads,
    interview_kits,
    rag_sources,
    private,
    settings,
    workspaces,
)


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(workspaces.router)
api_router.include_router(private.router)
api_router.include_router(settings.router)
api_router.include_router(email_threads.router)
api_router.include_router(candidates.router)
api_router.include_router(drafts.router)
api_router.include_router(interview_kits.router)
api_router.include_router(rag_sources.router)
api_router.include_router(audit_logs.router)
