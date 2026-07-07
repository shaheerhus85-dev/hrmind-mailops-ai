from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Candidate
from app.schemas import CandidateRead
from app.services.repository import require_workspace


router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("/{workspace_id}", response_model=list[CandidateRead])
def list_candidates(
    workspace_id: str, db: Session = Depends(get_db)
) -> list[Candidate]:
    require_workspace(db, workspace_id)
    return list(
        db.scalars(
            select(Candidate)
            .where(Candidate.workspace_id == workspace_id)
            .order_by(Candidate.match_score.desc())
        )
    )
