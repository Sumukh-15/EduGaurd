"""SQLAlchemy model for rule-based advisory recommendations."""

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.student import Student
    from backend.app.models.prediction import Prediction


class Recommendation(Base):
    """Deterministic rule-based advisory recommendation entity.

    Advisory suggestions generated from student telemetry to support human advisor review.
    These are heuristic decision-support recommendations, NOT compulsory punitive actions.
    """

    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prediction_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("predictions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # Academic, Attendance, Remediation, etc.
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")  # high, medium, low
    trigger_condition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="recommendations")
    prediction: Mapped[Optional["Prediction"]] = relationship(
        "Prediction",
        back_populates="recommendations",
    )

    def __repr__(self) -> str:
        return (
            f"<Recommendation id={self.id} student_id={self.student_id} "
            f"title={self.title!r} priority={self.priority!r}>"
        )
