from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, status
from jwt import InvalidTokenError
from passlib.context import CryptContext

from app.core.config import settings


password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_ALGORITHM = "HS256"


def require_jwt_secret() -> str:
    if not settings.jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Private workspace authentication is not configured.",
        )
    return settings.jwt_secret


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(user_id: str) -> tuple[str, int]:
    expires_minutes = max(5, settings.jwt_expires_minutes)
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": user_id, "iat": now, "exp": now + timedelta(minutes=expires_minutes)},
        require_jwt_secret(),
        algorithm=JWT_ALGORITHM,
    )
    return token, expires_minutes * 60


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, require_jwt_secret(), algorithms=[JWT_ALGORITHM])
        subject = payload.get("sub")
        if not isinstance(subject, str) or not subject:
            raise InvalidTokenError("Missing subject")
        return subject
    except InvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
