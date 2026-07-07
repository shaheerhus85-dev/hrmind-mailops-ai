from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import ReplyDraft
from app.schemas import ReplyDraftRead, ReplyDraftUpdate
from app.services.repository import require_workspace


router = APIRouter(prefix="/drafts", tags=["reply drafts"])


@router.get("/{workspace_id}", response_model=list[ReplyDraftRead])
def list_reply_drafts(
    workspace_id: str, db: Session = Depends(get_db)
) -> list[ReplyDraft]:
    require_workspace(db, workspace_id)
    return list(
        db.scalars(
            select(ReplyDraft)
            .where(ReplyDraft.workspace_id == workspace_id)
            .order_by(ReplyDraft.created_at.asc())
        )
    )


@router.patch("/{draft_id}", response_model=ReplyDraftRead)
def update_reply_draft(
    draft_id: str,
    payload: ReplyDraftUpdate,
    db: Session = Depends(get_db),
) -> ReplyDraft:
    draft = db.get(ReplyDraft, draft_id)
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply draft not found.",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(draft, field, value)
    db.commit()
    db.refresh(draft)
    return draft
