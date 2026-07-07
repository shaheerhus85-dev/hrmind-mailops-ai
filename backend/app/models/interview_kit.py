from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import new_id


class InterviewKit(Base):
    __tablename__ = "interview_kits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    candidate_id: Mapped[str] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    technical_questions: Mapped[list[str]] = mapped_column(JSON, default=list)
    behavioral_questions: Mapped[list[str]] = mapped_column(JSON, default=list)
    role_fit_questions: Mapped[list[str]] = mapped_column(JSON, default=list)
    red_flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    what_to_listen_for: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(40), default="ready")

    workspace: Mapped["Workspace"] = relationship(back_populates="interview_kits")
    candidate: Mapped["Candidate"] = relationship(back_populates="interview_kits")
