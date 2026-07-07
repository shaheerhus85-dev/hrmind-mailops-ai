from sqlalchemy import Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import new_id


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320))
    role: Mapped[str] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(120))
    match_score: Mapped[float] = mapped_column(Float, default=0)
    recommendation: Mapped[str] = mapped_column(String(200))
    next_step: Mapped[str] = mapped_column(Text)
    matched_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    missing_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    risk_note: Mapped[str] = mapped_column(Text, default="")

    workspace: Mapped["Workspace"] = relationship(back_populates="candidates")
    drafts: Mapped[list["ReplyDraft"]] = relationship(back_populates="candidate")
    interview_kits: Mapped[list["InterviewKit"]] = relationship(back_populates="candidate")
