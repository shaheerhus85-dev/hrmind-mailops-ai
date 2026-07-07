from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import new_id, utc_now


class EmailThread(Base):
    __tablename__ = "email_threads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    sender_name: Mapped[str] = mapped_column(String(160))
    sender_email: Mapped[str] = mapped_column(String(320))
    subject: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(100))
    priority: Mapped[str] = mapped_column(String(40))
    confidence: Mapped[float] = mapped_column(Float, default=0)
    body_preview: Mapped[str] = mapped_column(Text, default="")
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    status: Mapped[str] = mapped_column(String(40), default="pending")
    has_attachment: Mapped[bool] = mapped_column(Boolean, default=False)
    attachment_name: Mapped[str | None] = mapped_column(String(500), nullable=True)

    workspace: Mapped["Workspace"] = relationship(back_populates="email_threads")
