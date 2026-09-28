"""Pydantic schemas for authentication and authorization."""

from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """Credentials payload for POST /api/auth/login."""

    email: EmailStr = Field(..., description="Registered user email address")
    password: str = Field(..., min_length=1, description="Account password")


class TokenResponse(BaseModel):
    """OAuth2-compatible Bearer token response."""

    access_token: str = Field(..., description="Signed JWT access token")
    token_type: str = Field("bearer", description="Token type")
    role: str = Field(..., description="User role ('student', 'faculty', 'admin')")
    expires_in: int = Field(..., description="Token lifespan in seconds")


class TokenPayload(BaseModel):
    """Decoded JWT payload structure."""

    sub: str = Field(..., description="Subject claim (user ID)")
    role: str = Field(..., description="Assigned user role")
    exp: Optional[int] = Field(None, description="Expiration timestamp")


class UserRead(BaseModel):
    """Safe user profile response representation (never leaks passwords)."""

    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    student_id: Optional[int] = None
    student_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
