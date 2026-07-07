from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import WorkspaceSettings
from app.schemas import WorkspaceSettingsRead, WorkspaceSettingsUpdate
from app.services.repository import require_workspace


router = APIRouter(prefix="/settings", tags=["settings"])


def find_settings(db: Session, workspace_id: str) -> WorkspaceSettings:
    settings = db.scalar(
        select(WorkspaceSettings).where(WorkspaceSettings.workspace_id == workspace_id)
    )
    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace settings not found.",
        )
    return settings


@router.get("/{workspace_id}", response_model=WorkspaceSettingsRead)
def get_workspace_settings(
    workspace_id: str, db: Session = Depends(get_db)
) -> WorkspaceSettings:
    require_workspace(db, workspace_id)
    return find_settings(db, workspace_id)


@router.patch("/{workspace_id}", response_model=WorkspaceSettingsRead)
def update_workspace_settings(
    workspace_id: str,
    payload: WorkspaceSettingsUpdate,
    db: Session = Depends(get_db),
) -> WorkspaceSettings:
    require_workspace(db, workspace_id)
    workspace_settings = find_settings(db, workspace_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(workspace_settings, field, value)
    db.commit()
    db.refresh(workspace_settings)
    return workspace_settings
