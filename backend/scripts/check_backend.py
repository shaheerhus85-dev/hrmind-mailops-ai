from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import func, inspect, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_engine
from app.models import (
    Candidate,
    EmailThread,
    InterviewKit,
    RagSource,
    ReplyDraft,
    Workspace,
    WorkspaceSettings,
)
from app.seed import DEMO_WORKSPACE_ID


REQUIRED_TABLES = {
    "users",
    "workspaces",
    "workspace_settings",
    "email_threads",
    "candidates",
    "reply_drafts",
    "interview_kits",
    "rag_sources",
    "audit_logs",
}

MINIMUM_SEED_COUNTS = {
    "email_threads": 5,
    "candidates": 5,
    "reply_drafts": 5,
    "interview_kits": 5,
    "rag_sources": 0,
}

API_ENDPOINTS = [
    "/health",
    "/api/workspaces/demo",
    f"/api/settings/{DEMO_WORKSPACE_ID}",
    f"/api/email-threads/{DEMO_WORKSPACE_ID}",
    f"/api/candidates/{DEMO_WORKSPACE_ID}",
    f"/api/drafts/{DEMO_WORKSPACE_ID}",
    f"/api/interview-kits/{DEMO_WORKSPACE_ID}",
    f"/api/rag-sources/{DEMO_WORKSPACE_ID}",
]


def ok(message: str) -> None:
    print(f"OK  {message}")


def fail(message: str) -> None:
    print(f"ERR {message}", file=sys.stderr)
    raise SystemExit(1)


def count_rows(db: Session, model: Any) -> int:
    return int(db.scalar(select(func.count()).select_from(model)) or 0)


def check_database() -> None:
    if not settings.database_url:
        fail("DATABASE_URL is missing. Copy .env.example to .env or set the environment variable.")

    engine = get_engine()
    try:
        with engine.connect() as connection:
            connection.execute(text("select 1"))
    except SQLAlchemyError as error:
        fail(
            "database connection failed. Confirm PostgreSQL is running, "
            "the database exists, and DATABASE_URL has the right user/password. "
            f"Original error: {error}"
        )
    ok("database connection succeeded")

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    missing = sorted(REQUIRED_TABLES - existing_tables)
    if missing:
        fail(f"missing required tables: {', '.join(missing)}")
    ok("all required tables exist")

    with Session(engine) as db:
        workspace = db.get(Workspace, DEMO_WORKSPACE_ID)
        if workspace is None:
            fail(f"demo workspace {DEMO_WORKSPACE_ID!r} is missing")
        ok(f"demo workspace exists: {workspace.name}")

        settings_row = db.scalar(
            select(WorkspaceSettings).where(WorkspaceSettings.workspace_id == DEMO_WORKSPACE_ID)
        )
        if settings_row is None:
            fail("demo workspace settings are missing")
        ok("demo workspace settings exist")

        counts = {
            "email_threads": count_rows(db, EmailThread),
            "candidates": count_rows(db, Candidate),
            "reply_drafts": count_rows(db, ReplyDraft),
            "interview_kits": count_rows(db, InterviewKit),
            "rag_sources": count_rows(db, RagSource),
        }
        for key, minimum in MINIMUM_SEED_COUNTS.items():
            if counts[key] < minimum:
                fail(f"{key} count {counts[key]} is below expected minimum {minimum}")
        ok(f"seed counts verified: {json.dumps(counts, sort_keys=True)}")


def check_api_if_running() -> None:
    base_url = os.getenv("BACKEND_API_URL", "http://127.0.0.1:8000").rstrip("/")
    try:
        with urlopen(f"{base_url}/health", timeout=2) as response:
            if response.status != 200:
                fail(f"API health returned HTTP {response.status}")
    except URLError:
        print(f"SKIP API endpoint checks; server is not reachable at {base_url}")
        return

    for endpoint in API_ENDPOINTS:
        url = f"{base_url}{endpoint}"
        with urlopen(url, timeout=5) as response:
            if response.status != 200:
                fail(f"{endpoint} returned HTTP {response.status}")
            payload = json.loads(response.read().decode("utf-8"))
            if endpoint != "/health" and payload is None:
                fail(f"{endpoint} returned an empty payload")
    ok(f"API endpoints verified at {base_url}")


def main() -> None:
    print(f"Backend environment: {settings.environment}")
    check_database()
    check_api_if_running()


if __name__ == "__main__":
    main()
