"""Authentication endpoints for login and user profile inspection."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import settings
from backend.app.core.security import create_access_token, verify_password
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate User",
    description="Authenticates with email and password, returning an OAuth2 Bearer JWT token.",
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate credentials and issue a signed JWT.

    SECURITY REQUIREMENT:
    Returns a generic 401 error message regardless of whether the email was not found
    or the password was incorrect, preventing username/account enumeration.
    """
    user = db.query(User).filter(User.email == credentials.email.lower().strip()).first()

    if user is None or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    token = create_access_token(
        subject=user.id,
        role=user.role,
        extra_claims={"email": user.email},
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get(
    "/me",
    response_model=UserRead,
    summary="Current User Profile",
    description="Retrieves the authenticated user's profile and linked student profile identifiers.",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """Return profile for the currently authenticated user without exposing passwords."""
    student_id = current_user.student.id if current_user.student else None
    student_code = current_user.student.student_code if current_user.student else None

    return UserRead(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        student_id=student_id,
        student_code=student_code,
    )
