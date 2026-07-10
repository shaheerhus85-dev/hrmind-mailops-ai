from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import User, Workspace, WorkspaceSettings
from app.schemas import AuthLogin, AuthSignup, AuthTokenResponse, UserRead


router = APIRouter(prefix="/auth", tags=["authentication"])


def normalize_email(email: str) -> str:
    return email.strip().lower()


def auth_response(user: User, workspace: Workspace) -> AuthTokenResponse:
    token, expires_in = create_access_token(user.id)
    return AuthTokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=user,
        workspace=workspace,
    )


@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: AuthSignup, db: Session = Depends(get_db)) -> AuthTokenResponse:
    email = normalize_email(str(payload.email))
    if db.scalar(select(User).where(func.lower(User.email) == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")

    display_name = (payload.name or "").strip() or email.split("@", 1)[0].replace(".", " ").title()
    user = User(email=email, name=display_name, password_hash=hash_password(payload.password))
    workspace = Workspace(owner=user, name=f"{display_name}'s Workspace", mode="private")
    workspace.settings = WorkspaceSettings(
        demo_mode=False,
        human_review_required=True,
        draft_only=True,
        no_auto_send=True,
        no_message_deletion=True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.") from error
    db.refresh(user)
    db.refresh(workspace)
    return auth_response(user, workspace)


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: AuthLogin, db: Session = Depends(get_db)) -> AuthTokenResponse:
    email = normalize_email(str(payload.email))
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    workspace = db.scalar(
        select(Workspace).where(Workspace.owner_user_id == user.id, Workspace.mode == "private")
    )
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Private workspace is unavailable.")
    return auth_response(user, workspace)


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> User:
    return user
