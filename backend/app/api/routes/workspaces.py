from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Workspace
from app.schemas import WorkspaceRead


router = APIRouter(prefix="/workspaces", tags=["workspaces"])
DEMO_WORKSPACE_ID = "demo_ws_local"


@router.get("/demo", response_model=WorkspaceRead)
def get_demo_workspace(db: Session = Depends(get_db)) -> Workspace:
    workspace = db.get(Workspace, DEMO_WORKSPACE_ID)
    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo workspace is not seeded. Run python -m app.seed.",
        )
    return workspace
