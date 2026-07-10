"""Local integration checks for Phase 6B auth and private workspace routes."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import get_session_factory
from app.main import app
from app.models import User


def expect(response, status_code: int):
    if response.status_code != status_code:
        raise AssertionError(f"{response.request.method} {response.request.url}: {response.status_code} {response.text}")
    return response


def main() -> None:
    email = f"phase6b-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}@example.com"
    password = "PortfolioDemo!42"
    client = TestClient(app)
    user_id: str | None = None

    try:
        expect(client.get("/api/private/settings"), 401)

        signup = expect(
            client.post("/api/auth/signup", json={"email": email, "password": password, "name": "Phase 6B QA"}),
            201,
        ).json()
        token = signup["access_token"]
        user_id = signup["user"]["id"]
        headers = {"Authorization": f"Bearer {token}"}

        with get_session_factory()() as db:
            user = db.get(User, user_id)
            assert user is not None
            assert user.password_hash and user.password_hash != password

        expect(client.get("/api/auth/me", headers=headers), 200)
        workspace = expect(client.get("/api/workspaces/me", headers=headers), 200).json()
        assert workspace["mode"] == "private"

        for route in ("email-threads", "candidates", "drafts", "interview-kits", "rag-sources"):
            assert expect(client.get(f"/api/private/{route}", headers=headers), 200).json() == []

        initial = expect(client.get("/api/private/settings", headers=headers), 200).json()
        assert initial["demo_mode"] is False and initial["no_auto_send"] is True
        expect(client.patch("/api/private/settings", headers=headers, json={"draft_only": False}), 200)
        persisted = expect(client.get("/api/private/settings", headers=headers), 200).json()
        assert persisted["draft_only"] is False and persisted["demo_mode"] is False

        login = expect(client.post("/api/auth/login", json={"email": email, "password": password}), 200).json()
        expect(client.get("/api/auth/me", headers={"Authorization": f"Bearer {login['access_token']}"}), 200)

        print("Auth signup/login, JWT protection, empty private data, and settings persistence passed.")
    finally:
        if user_id:
            with get_session_factory()() as db:
                user = db.scalar(select(User).where(User.id == user_id))
                if user is not None:
                    db.delete(user)
                    db.commit()


if __name__ == "__main__":
    main()
