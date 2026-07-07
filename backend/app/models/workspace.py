from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import new_id, utc_now


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    owner_user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    mode: Mapped[str] = mapped_column(String(40), default="private")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    owner: Mapped["User"] = relationship(back_populates="workspaces")
    settings: Mapped["WorkspaceSettings | None"] = relationship(
        back_populates="workspace", uselist=False, cascade="all, delete-orphan"
    )
    email_threads: Mapped[list["EmailThread"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    candidates: Mapped[list["Candidate"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    drafts: Mapped[list["ReplyDraft"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    interview_kits: Mapped[list["InterviewKit"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    rag_sources: Mapped[list["RagSource"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan"
    )
