"""SQLAlchemy model for administrative and security audit logging."""

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.user import User


class AuditLog(Base):
    """Tracks administrative and security actions across EduGuard.

    Actions recorded:
      - user_created
      - user_deactivated
      - user_reactivated
      - assignment_created
      - assignment_deleted
      - dataset_upload
    """

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    actor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[actor_user_id])

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action!r} actor_id={self.actor_user_id} target={self.target!r}>"
