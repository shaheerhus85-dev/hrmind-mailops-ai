from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import AuditLog
from app.schemas import AuditLogCreate, AuditLogRead
from app.services.repository import require_workspace


router = APIRouter(prefix="/audit-logs", tags=["audit logs"])


@router.post("", response_model=AuditLogRead, status_code=201)
def create_audit_log(
    payload: AuditLogCreate, db: Session = Depends(get_db)
) -> AuditLog:
    require_workspace(db, payload.workspace_id)
    audit_log = AuditLog(**payload.model_dump())
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log
