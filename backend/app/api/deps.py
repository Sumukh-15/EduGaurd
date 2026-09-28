"""Authentication, authorization, and ownership verification dependencies."""

from typing import Callable, List, Sequence, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import decode_access_token
from backend.app.db.session import get_db
from backend.app.models.user import User

# OAuth2 scheme pointing to token endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate Bearer token and retrieve the authenticated active user.

    Raises 401 Unauthorized if token is missing, invalid, or expired.
    Raises 400 Bad Request if the account is deactivated.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    return user


def require_roles(*roles: str) -> Callable[[User], User]:
    """Dependency factory enforcing Role-Based Access Control (RBAC).

    Usage
    -----
    @router.get("/faculty-only", dependencies=[Depends(require_roles("faculty", "admin"))])
    """
    allowed_roles = set(roles)

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {sorted(list(allowed_roles))}, your role: '{current_user.role}'.",
            )
        return current_user

    return role_checker


def verify_student_access(
    student_id: int,
    current_user: User = Depends(get_current_user),
) -> User:
    """Enforce strict student ownership and privacy boundaries.

    Authorization Rules:
      - faculty / admin: Permitted to access any student profile, history, or telemetry.
      - student: Permitted ONLY if student_id matches their linked Student profile id.
                 Cross-student access strictly returns 403 Forbidden.
    """
    if current_user.role in ("faculty", "admin"):
        return current_user

    if current_user.role == "student":
        if not current_user.student or current_user.student.id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view or evaluate your own student profile and records.",
            )
        return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized role for student record access.",
    )
