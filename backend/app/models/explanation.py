"""SQLAlchemy model for SHAP feature explanations."""

from typing import Optional, TYPE_CHECKING
from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

if TYPE_CHECKING:
    from backend.app.models.prediction import Prediction


class Explanation(Base):
    """SHAP feature attribution entity.

    Stores decomposed feature contributions for an individual prediction.
    Features reflect mathematical attribution towards the model's log-odds output,
    NOT causal interventions.
    """

    __tablename__ = "explanations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    prediction_id: Mapped[int] = mapped_column(
        ForeignKey("predictions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    feature_name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name: Mapped[str] = mapped_column(String(150), nullable=False)
    contribution: Mapped[float] = mapped_column(Float, nullable=False)  # SHAP value
    direction: Mapped[str] = mapped_column(String(20), nullable=False)  # "increases_risk" or "decreases_risk"
    raw_value: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    prediction: Mapped["Prediction"] = relationship("Prediction", back_populates="explanations")

    def __repr__(self) -> str:
        return (
            f"<Explanation id={self.id} prediction_id={self.prediction_id} "
            f"feature={self.feature_name!r} contrib={self.contribution:.4f}>"
        )
