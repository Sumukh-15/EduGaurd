"""SQLAlchemy model for student academic records and telemetry."""

from datetime import datetime, timezone
from typing import Dict, List, TYPE_CHECKING, Any
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.student import Student
    from backend.app.models.prediction import Prediction


class AcademicRecord(Base):
    """Academic record entity capturing student attributes and mid-term assessments.

    STRICT ANTI-LEAKAGE GUARANTEE:
    This model captures strictly the 32 permissible features (G1 and G2 included).
    The final examination grade G3 is strictly excluded from this model and table.
    """

    __tablename__ = "academic_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    term: Mapped[str] = mapped_column(String(20), nullable=False, default="Term 1")
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # 15 Numerical features
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    Medu: Mapped[int] = mapped_column(Integer, nullable=False)
    Fedu: Mapped[int] = mapped_column(Integer, nullable=False)
    traveltime: Mapped[int] = mapped_column(Integer, nullable=False)
    studytime: Mapped[int] = mapped_column(Integer, nullable=False)
    failures: Mapped[int] = mapped_column(Integer, nullable=False)
    famrel: Mapped[int] = mapped_column(Integer, nullable=False)
    freetime: Mapped[int] = mapped_column(Integer, nullable=False)
    goout: Mapped[int] = mapped_column(Integer, nullable=False)
    Dalc: Mapped[int] = mapped_column(Integer, nullable=False)
    Walc: Mapped[int] = mapped_column(Integer, nullable=False)
    health: Mapped[int] = mapped_column(Integer, nullable=False)
    absences: Mapped[int] = mapped_column(Integer, nullable=False)
    G1: Mapped[float] = mapped_column(Float, nullable=False)
    G2: Mapped[float] = mapped_column(Float, nullable=False)

    # 17 Categorical features
    school: Mapped[str] = mapped_column(String(10), nullable=False)
    sex: Mapped[str] = mapped_column(String(5), nullable=False)
    address: Mapped[str] = mapped_column(String(5), nullable=False)
    famsize: Mapped[str] = mapped_column(String(10), nullable=False)
    Pstatus: Mapped[str] = mapped_column(String(5), nullable=False)
    schoolsup: Mapped[str] = mapped_column(String(5), nullable=False)
    famsup: Mapped[str] = mapped_column(String(5), nullable=False)
    paid: Mapped[str] = mapped_column(String(5), nullable=False)
    activities: Mapped[str] = mapped_column(String(5), nullable=False)
    nursery: Mapped[str] = mapped_column(String(5), nullable=False)
    higher: Mapped[str] = mapped_column(String(5), nullable=False)
    internet: Mapped[str] = mapped_column(String(5), nullable=False)
    romantic: Mapped[str] = mapped_column(String(5), nullable=False)
    Mjob: Mapped[str] = mapped_column(String(20), nullable=False)
    Fjob: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str] = mapped_column(String(20), nullable=False)
    guardian: Mapped[str] = mapped_column(String(20), nullable=False)

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="academic_records")
    predictions: Mapped[List["Prediction"]] = relationship(
        "Prediction",
        back_populates="academic_record",
    )

    def to_ml_feature_dict(self) -> Dict[str, Any]:
        """Export exactly the 32 input attributes expected by the ML inference pipeline."""
        return {
            "age": self.age,
            "Medu": self.Medu,
            "Fedu": self.Fedu,
            "traveltime": self.traveltime,
            "studytime": self.studytime,
            "failures": self.failures,
            "famrel": self.famrel,
            "freetime": self.freetime,
            "goout": self.goout,
            "Dalc": self.Dalc,
            "Walc": self.Walc,
            "health": self.health,
            "absences": self.absences,
            "G1": self.G1,
            "G2": self.G2,
            "school": self.school,
            "sex": self.sex,
            "address": self.address,
            "famsize": self.famsize,
            "Pstatus": self.Pstatus,
            "schoolsup": self.schoolsup,
            "famsup": self.famsup,
            "paid": self.paid,
            "activities": self.activities,
            "nursery": self.nursery,
            "higher": self.higher,
            "internet": self.internet,
            "romantic": self.romantic,
            "Mjob": self.Mjob,
            "Fjob": self.Fjob,
            "reason": self.reason,
            "guardian": self.guardian,
        }

    def __repr__(self) -> str:
        return f"<AcademicRecord id={self.id} student_id={self.student_id} term={self.term!r} G1={self.G1} G2={self.G2}>"
