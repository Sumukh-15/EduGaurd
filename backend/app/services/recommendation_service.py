"""Deterministic rule-based recommendations engine for EduGuard.

This service applies project-approved institutional heuristics to student academic telemetry
to generate supportive, non-punitive, and actionable advisory interventions.

IMPORTANT GOVERNANCE & NON-CAUSAL CONSTRAINTS:
1. NO LLM / NO GENERATIVE AI: All recommendations are strictly deterministic rules.
2. NO CAUSAL CLAIMS: Observed correlations (e.g. low study time, absences) do not prove causation.
   Recommendations provide decision support for certified human advisors and educators.
3. ZERO TARGET LEAKAGE: Final outcome G3 is NEVER used or admitted into recommendation evaluation.
4. APPEND-ONLY INTEGRITY: Historical predictions and past recommendations are never overwritten.
"""

from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.models.academic_record import AcademicRecord
from backend.app.models.prediction import Prediction
from backend.app.models.recommendation import Recommendation
from backend.app.models.student import Student


ADVISORY_NOTICE: str = (
    "Recommendations are rule-based, non-causal decision-support guidance derived from heuristic "
    "thresholds on observed academic telemetry. They do not constitute deterministic causal conclusions "
    "or automated punitive sanctions. All interventions require evaluation and contextual validation "
    "by a certified human advisor or instructor."
)

# Canonical ordering ranking for deterministic rule sorting
RULE_ORDER: Dict[str, int] = {
    "delta_g < -2": 1,
    "G2 < 10": 2,
    "absences >= 10": 3,
    "studytime <= 1": 4,
}


class RecommendationData:
    """In-memory representation of an evaluated rule recommendation."""

    def __init__(
        self,
        trigger_condition: str,
        category: str,
        priority: str,
        title: str,
        description: str,
        order_rank: int,
    ) -> None:
        self.trigger_condition = trigger_condition
        self.category = category
        self.priority = priority
        self.title = title
        self.description = description
        self.order_rank = order_rank


class RecommendationService:
    """Pure deterministic rule engine for student academic recommendations."""

    @staticmethod
    def evaluate_rules(record: Any) -> List[RecommendationData]:
        """Evaluate the 4 approved deterministic rules against academic telemetry.

        Parameters
        ----------
        record : AcademicRecord or dict-like object
            Telemetry record containing G1, G2, absences, and studytime.
            (Target G3 is strictly ignored even if present).

        Returns
        -------
        List[RecommendationData]
            Triggered recommendations sorted by stable canonical rule order.
        """
        if record is None:
            return []

        # Extract required numeric fields safely
        if isinstance(record, dict):
            g1 = float(record.get("G1", 0.0))
            g2 = float(record.get("G2", 0.0))
            absences = int(record.get("absences", 0))
            studytime = int(record.get("studytime", 0))
        else:
            g1 = float(getattr(record, "G1", 0.0))
            g2 = float(getattr(record, "G2", 0.0))
            absences = int(getattr(record, "absences", 0))
            studytime = int(getattr(record, "studytime", 0))

        delta_g = g2 - g1
        triggered: List[RecommendationData] = []

        # Rule 1: Grade Velocity (ΔG = G2 - G1 < -2)
        if delta_g < -2.0:
            triggered.append(
                RecommendationData(
                    trigger_condition="delta_g < -2",
                    category="Academic Progress",
                    priority="high",
                    title="Rapid Grade Trajectory Decline",
                    description=(
                        f"Recent period-over-period grade decline of {delta_g:+.1f} points "
                        f"(G1: {g1:.1f} -> G2: {g2:.1f}) indicates sharp academic deceleration. "
                        "Advisory intervention: Schedule an instructor office-hours review to audit retention "
                        "of introductory syllabus concepts and provide targeted study problem sets."
                    ),
                    order_rank=RULE_ORDER["delta_g < -2"],
                )
            )

        # Rule 2: Critical Secondary Evaluation Score (G2 < 10)
        if g2 < 10.0:
            triggered.append(
                RecommendationData(
                    trigger_condition="G2 < 10",
                    category="Academic Remediation",
                    priority="high",
                    title="Performance Below Passing Standard",
                    description=(
                        f"Second-period academic score of {g2:.1f} is currently below the standard 10/20 "
                        "passing threshold. Advisory intervention: Connect student with department tutoring "
                        "assistance, supplemental instruction workshops, and review foundational exam topics "
                        "before final evaluations."
                    ),
                    order_rank=RULE_ORDER["G2 < 10"],
                )
            )

        # Rule 3: Chronic Absenteeism (absences >= 10)
        if absences >= 10:
            triggered.append(
                RecommendationData(
                    trigger_condition="absences >= 10",
                    category="Attendance",
                    priority="medium",
                    title="Chronic Absenteeism Warning",
                    description=(
                        f"Recorded cumulative absences ({absences} sessions) meet or exceed the institutional "
                        "early-warning threshold of 10 sessions. Advisory intervention: Facilitate student "
                        "advisor check-in to identify potential attendance barriers (transportation, health, "
                        "or scheduling conflicts) and reinforce attendance recovery policies."
                    ),
                    order_rank=RULE_ORDER["absences >= 10"],
                )
            )

        # Rule 4: Low Weekly Study Time Allocation (studytime <= 1)
        if studytime <= 1:
            triggered.append(
                RecommendationData(
                    trigger_condition="studytime <= 1",
                    category="Study Strategy",
                    priority="medium",
                    title="Low Weekly Study Time Allocation",
                    description=(
                        f"Reported weekly dedicated study time is 1 or fewer units (< 2 hours per week, "
                        f"reported level: {studytime}). Advisory intervention: Recommend academic coaching "
                        "on time management, structured weekly study calendar planning, and guided library "
                        "study sessions."
                    ),
                    order_rank=RULE_ORDER["studytime <= 1"],
                )
            )

        # Stable, deterministic ordering by canonical rank
        triggered.sort(key=lambda r: r.order_rank)
        return triggered

    @classmethod
    def get_or_create_recommendations(
        cls,
        db: Session,
        student_id: int,
        persist: bool = True,
    ) -> Tuple[Optional[Student], List[Recommendation], Optional[Prediction], Optional[AcademicRecord]]:
        """Retrieve or evaluate deterministic recommendations for a student.

        If recommendations have already been persisted for the student's latest prediction,
        returns them in canonical order. If not yet persisted, evaluates the rules,
        persists the Recommendation entities, and returns them.

        Parameters
        ----------
        db : Session
            Active SQLAlchemy database session.
        student_id : int
            Primary key ID of the student.
        persist : bool
            Whether to persist newly evaluated recommendations to the database.

        Returns
        -------
        Tuple[Optional[Student], List[Recommendation], Optional[Prediction], Optional[AcademicRecord]]
            (student, recommendations_list, latest_prediction, latest_academic_record)
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None, [], None, None

        # 1. Locate latest prediction (if any)
        latest_prediction = (
            db.query(Prediction)
            .filter(Prediction.student_id == student_id)
            .order_by(Prediction.created_at.desc(), Prediction.id.desc())
            .first()
        )

        # 2. Locate relevant academic record
        if latest_prediction and latest_prediction.academic_record:
            academic_record = latest_prediction.academic_record
        else:
            academic_record = (
                db.query(AcademicRecord)
                .filter(AcademicRecord.student_id == student_id)
                .order_by(AcademicRecord.recorded_at.desc(), AcademicRecord.id.desc())
                .first()
            )

        # 3. Check for existing persisted recommendations
        if latest_prediction:
            existing_recs = (
                db.query(Recommendation)
                .filter(Recommendation.prediction_id == latest_prediction.id)
                .all()
            )
        else:
            existing_recs = (
                db.query(Recommendation)
                .filter(
                    Recommendation.student_id == student_id,
                    Recommendation.prediction_id == None,  # noqa: E711
                )
                .all()
            )

        if existing_recs:
            # Sort existing recommendations by canonical rule order
            sorted_recs = sorted(
                existing_recs,
                key=lambda r: RULE_ORDER.get(r.trigger_condition or "", 99),
            )
            return student, sorted_recs, latest_prediction, academic_record

        # 4. If no academic record exists, zero rules can be evaluated
        if not academic_record:
            return student, [], latest_prediction, None

        # 5. Evaluate deterministic rules
        rule_results = cls.evaluate_rules(academic_record)
        if not rule_results:
            return student, [], latest_prediction, academic_record

        # 6. Instantiate and persist new Recommendation records
        new_recs: List[Recommendation] = []
        for res in rule_results:
            rec = Recommendation(
                student_id=student.id,
                prediction_id=latest_prediction.id if latest_prediction else None,
                title=res.title,
                description=res.description,
                category=res.category,
                priority=res.priority,
                trigger_condition=res.trigger_condition,
                is_acknowledged=False,
            )
            new_recs.append(rec)

        if persist and new_recs:
            db.add_all(new_recs)
            db.commit()
            for r in new_recs:
                db.refresh(r)

        # Ensure return is in canonical sorted order
        new_recs.sort(key=lambda r: RULE_ORDER.get(r.trigger_condition or "", 99))
        return student, new_recs, latest_prediction, academic_record


# Singleton instance for application usage
recommendation_service = RecommendationService()
