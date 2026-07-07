from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import EmailThread
from app.schemas import EmailThreadRead
from app.services.repository import require_workspace


router = APIRouter(prefix="/email-threads", tags=["email threads"])


@router.get("/{workspace_id}", response_model=list[EmailThreadRead])
def list_email_threads(
    workspace_id: str, db: Session = Depends(get_db)
) -> list[EmailThread]:
    require_workspace(db, workspace_id)
    return list(
        db.scalars(
            select(EmailThread)
            .where(EmailThread.workspace_id == workspace_id)
            .order_by(EmailThread.received_at.desc())
        )
    )
