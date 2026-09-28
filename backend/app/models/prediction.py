"""SQLAlchemy model for machine learning predictions."""

from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.student import Student
    from backend.app.models.academic_record import AcademicRecord
    from backend.app.models.explanation import Explanation
    from backend.app.models.recommendation import Recommendation


class Prediction(Base):
    """Machine learning prediction entity.

    APPEND-ONLY INVARIANT:
    Predictions are immutable once inserted. Every inference for a student
    creates a new timestamped row to preserve complete historical risk trajectories.
    """

    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    academic_record_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("academic_records.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ML Output metrics
    risk_probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(10), nullable=False)  # "Low", "Medium", "High"
    at_risk_binary: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 or 1
    model_version: Mapped[str] = mapped_column(String(20), nullable=False, default="v1.0.0")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="predictions")
    academic_record: Mapped[Optional["AcademicRecord"]] = relationship(
        "AcademicRecord",
        back_populates="predictions",
    )
    explanations: Mapped[List["Explanation"]] = relationship(
        "Explanation",
        back_populates="prediction",
        cascade="all, delete-orphan",
        order_by="Explanation.id",
    )
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation",
        back_populates="prediction",
        cascade="all, delete-orphan",
        order_by="Recommendation.created_at.desc()",
    )

    def __repr__(self) -> str:
        return (
            f"<Prediction id={self.id} student_id={self.student_id} "
            f"risk_level={self.risk_level!r} prob={self.risk_probability:.4f}>"
        )
