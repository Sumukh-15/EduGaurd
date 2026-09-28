"""Security and cryptography utilities: password hashing and JWT token handling."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
from jose import jwt, JWTError
from passlib.context import CryptContext

from backend.app.core.config import settings

# Passlib CryptContext using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash using constant-time check."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a secure salted bcrypt hash for a plaintext password."""
    return pwd_context.hash(password)


def create_access_token(
    subject: Union[str, int],
    role: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Create a signed JWT access token.

    Parameters
    ----------
    subject : str or int
        User identifier (stored in standard 'sub' claim).
    role : str
        User role ('student', 'faculty', 'admin').
    expires_delta : timedelta, optional
        Custom expiration time. Defaults to settings.ACCESS_TOKEN_EXPIRE_MINUTES.
    extra_claims : dict, optional
        Additional non-sensitive claims to encode into the token payload.

    Returns
    -------
    str
        Encoded and signed JWT string.
    """
    if expires_delta is not None:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT access token.

    Raises JWTError if signature is invalid or token has expired.
    """
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
