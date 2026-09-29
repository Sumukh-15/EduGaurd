"""SQLAlchemy model for mentor-student assignments."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.student import Student


class MentorAssignment(Base):
    """Mentor-student assignment entity.

    Scopes faculty visibility and evaluation rights strictly to assigned students.
    Institutional administrators retain universal cross-cohort visibility.
    """

    __tablename__ = "mentor_assignments"
    __table_args__ = (
        UniqueConstraint("faculty_user_id", "student_id", name="uq_mentor_assignments_faculty_student"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    faculty_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    faculty_user: Mapped["User"] = relationship("User", back_populates="mentor_assignments")
    student: Mapped["Student"] = relationship("Student", back_populates="mentor_assignments")

    def __repr__(self) -> str:
        return f"<MentorAssignment id={self.id} faculty_user_id={self.faculty_user_id} student_id={self.student_id}>"
