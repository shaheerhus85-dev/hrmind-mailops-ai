from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import RagSource
from app.schemas import RagSourceRead
from app.services.repository import require_workspace


router = APIRouter(prefix="/rag-sources", tags=["RAG source metadata"])


@router.get("/{workspace_id}", response_model=list[RagSourceRead])
def list_rag_sources(
    workspace_id: str, db: Session = Depends(get_db)
) -> list[RagSource]:
    require_workspace(db, workspace_id)
    return list(
        db.scalars(
            select(RagSource)
            .where(RagSource.workspace_id == workspace_id)
            .order_by(RagSource.created_at.desc())
        )
    )
