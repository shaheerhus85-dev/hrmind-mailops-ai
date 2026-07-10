from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_private_workspace
from app.db.session import get_db
from app.models import Candidate, EmailThread, InterviewKit, RagSource, ReplyDraft, Workspace, WorkspaceSettings
from app.schemas import (
    CandidateRead,
    EmailThreadRead,
    InterviewKitRead,
    RagSourceRead,
    ReplyDraftRead,
    WorkspaceSettingsRead,
    WorkspaceSettingsUpdate,
)


router = APIRouter(prefix="/private", tags=["private workspace"])


def private_settings(db: Session, workspace: Workspace) -> WorkspaceSettings:
    workspace_settings = db.scalar(
        select(WorkspaceSettings).where(WorkspaceSettings.workspace_id == workspace.id)
    )
    if workspace_settings is None:
        workspace_settings = WorkspaceSettings(workspace_id=workspace.id, demo_mode=False)
        db.add(workspace_settings)
        db.commit()
        db.refresh(workspace_settings)
    return workspace_settings


@router.get("/settings", response_model=WorkspaceSettingsRead)
def get_settings(
    workspace: Workspace = Depends(get_private_workspace), db: Session = Depends(get_db)
) -> WorkspaceSettings:
    return private_settings(db, workspace)


@router.patch("/settings", response_model=WorkspaceSettingsRead)
def patch_settings(
    payload: WorkspaceSettingsUpdate,
    workspace: Workspace = Depends(get_private_workspace),
    db: Session = Depends(get_db),
) -> WorkspaceSettings:
    workspace_settings = private_settings(db, workspace)
    allowed = {"human_review_required", "draft_only", "no_auto_send", "no_message_deletion"}
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in allowed:
            setattr(workspace_settings, field, value)
    workspace_settings.demo_mode = False
    db.commit()
    db.refresh(workspace_settings)
    return workspace_settings


def list_for_workspace(db: Session, model: type, workspace: Workspace) -> list:
    return list(db.scalars(select(model).where(model.workspace_id == workspace.id)))


@router.get("/email-threads", response_model=list[EmailThreadRead])
def email_threads(workspace: Workspace = Depends(get_private_workspace), db: Session = Depends(get_db)) -> list[EmailThread]:
    return list_for_workspace(db, EmailThread, workspace)


@router.get("/candidates", response_model=list[CandidateRead])
def candidates(workspace: Workspace = Depends(get_private_workspace), db: Session = Depends(get_db)) -> list[Candidate]:
    return list_for_workspace(db, Candidate, workspace)


@router.get("/drafts", response_model=list[ReplyDraftRead])
def drafts(workspace: Workspace = Depends(get_private_workspace), db: Session = Depends(get_db)) -> list[ReplyDraft]:
    return list_for_workspace(db, ReplyDraft, workspace)


@router.get("/interview-kits", response_model=list[InterviewKitRead])
def interview_kits(workspace: Workspace = Depends(get_private_workspace), db: Session = Depends(get_db)) -> list[InterviewKit]:
    return list_for_workspace(db, InterviewKit, workspace)


@router.get("/rag-sources", response_model=list[RagSourceRead])
def rag_sources(workspace: Workspace = Depends(get_private_workspace), db: Session = Depends(get_db)) -> list[RagSource]:
    return list_for_workspace(db, RagSource, workspace)
