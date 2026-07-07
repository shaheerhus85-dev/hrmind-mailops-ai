from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OrmSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database_configured: bool
    safety: dict[str, bool]


class WorkspaceRead(OrmSchema):
    id: str
    owner_user_id: str
    name: str
    mode: str
    created_at: datetime


class WorkspaceSettingsRead(OrmSchema):
    id: str
    workspace_id: str
    demo_mode: bool
    human_review_required: bool
    draft_only: bool
    no_auto_send: bool
    no_message_deletion: bool
    created_at: datetime
    updated_at: datetime


class WorkspaceSettingsUpdate(BaseModel):
    demo_mode: bool | None = None
    human_review_required: bool | None = None
    draft_only: bool | None = None
    no_auto_send: bool | None = None
    no_message_deletion: bool | None = None


class EmailThreadRead(OrmSchema):
    id: str
    workspace_id: str
    sender_name: str
    sender_email: str
    subject: str
    category: str
    priority: str
    confidence: float
    body_preview: str
    received_at: datetime
    status: str
    has_attachment: bool
    attachment_name: str | None


class CandidateRead(OrmSchema):
    id: str
    workspace_id: str
    name: str
    email: str
    role: str
    source: str
    match_score: float
    recommendation: str
    next_step: str
    matched_skills: list[str]
    missing_skills: list[str]
    risk_note: str


class ReplyDraftRead(OrmSchema):
    id: str
    workspace_id: str
    candidate_id: str
    title: str
    purpose: str
    selected_variant: str
    variant_short: str
    variant_warm: str
    variant_policy: str
    status: str
    requires_human_review: bool
    created_at: datetime
    updated_at: datetime


class ReplyDraftUpdate(BaseModel):
    selected_variant: str | None = None
    variant_short: str | None = None
    variant_warm: str | None = None
    variant_policy: str | None = None
    status: str | None = None
    requires_human_review: bool | None = None


class InterviewKitRead(OrmSchema):
    id: str
    workspace_id: str
    candidate_id: str
    title: str
    technical_questions: list[str]
    behavioral_questions: list[str]
    role_fit_questions: list[str]
    red_flags: list[str]
    what_to_listen_for: list[str]
    status: str


class RagSourceRead(OrmSchema):
    id: str
    workspace_id: str
    filename: str
    mime_type: str
    size_bytes: int
    status: str
    created_at: datetime


class AuditLogCreate(BaseModel):
    workspace_id: str
    actor: str
    action: str
    target_type: str
    target_id: str
    message: str


class AuditLogRead(OrmSchema):
    id: str
    workspace_id: str
    actor: str
    action: str
    target_type: str
    target_id: str
    message: str
    created_at: datetime
