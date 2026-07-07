from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import InterviewKit
from app.schemas import InterviewKitRead
from app.services.repository import require_workspace


router = APIRouter(prefix="/interview-kits", tags=["interview kits"])


@router.get("/{workspace_id}", response_model=list[InterviewKitRead])
def list_interview_kits(
    workspace_id: str, db: Session = Depends(get_db)
) -> list[InterviewKit]:
    require_workspace(db, workspace_id)
    return list(
        db.scalars(
            select(InterviewKit)
            .where(InterviewKit.workspace_id == workspace_id)
            .order_by(InterviewKit.title.asc())
        )
    )
