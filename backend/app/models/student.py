"""SQLAlchemy model for student institutional profiles."""

from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.user import User
    from backend.app.models.academic_record import AcademicRecord
    from backend.app.models.prediction import Prediction
    from backend.app.models.recommendation import Recommendation


class Student(Base):
    """Student institutional profile entity.

    The canonical immutable identifier is `student_code` (e.g. 'STU00001').
    The 32 ML features do NOT define identity.
    `user_id` is a nullable unique foreign key to `users.id` — batch CSV enrolled
    students may exist without an active user account until claimed.
    """

    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    student_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
        index=True,
    )

    # Demographic / Institutional fields
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cohort_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    school: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="student")
    academic_records: Mapped[List["AcademicRecord"]] = relationship(
        "AcademicRecord",
        back_populates="student",
        cascade="all, delete-orphan",
        order_by="AcademicRecord.recorded_at.desc()",
    )
    predictions: Mapped[List["Prediction"]] = relationship(
        "Prediction",
        back_populates="student",
        cascade="all, delete-orphan",
        order_by="Prediction.created_at.desc()",
    )
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation",
        back_populates="student",
        cascade="all, delete-orphan",
        order_by="Recommendation.created_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<Student id={self.id} student_code={self.student_code!r}>"
