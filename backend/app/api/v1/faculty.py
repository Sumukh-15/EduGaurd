"""Faculty and institutional monitoring endpoints."""

from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.deps import require_roles
from backend.app.db.session import get_db
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.analytics import (
    FacultyAnalyticsResponse,
    RiskDistribution,
    RiskPercentages,
    SchoolDistribution,
)

router = APIRouter(prefix="/faculty", tags=["Faculty"])


@router.get(
    "/analytics",
    response_model=FacultyAnalyticsResponse,
    summary="Get Faculty Cohort Analytics",
    description="Retrieve aggregate, non-identifying cohort risk distributions and monitoring statistics across enrolled students. Strictly restricted to faculty and administrator roles.",
)
def get_faculty_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("faculty", "admin")),
) -> FacultyAnalyticsResponse:
    """Compute aggregate risk metrics across the student population."""
    # Macro counts
    total_students = db.query(func.count(Student.id)).scalar() or 0
    total_predictions = db.query(func.count(Prediction.id)).scalar() or 0

    # Retrieve each student's latest prediction via max id subquery
    latest_pred_subq = (
        db.query(
            Prediction.student_id,
            func.max(Prediction.id).label("max_id"),
        )
        .group_by(Prediction.student_id)
        .subquery()
    )

    latest_records = (
        db.query(Prediction, Student.school)
        .join(latest_pred_subq, Prediction.id == latest_pred_subq.c.max_id)
        .join(Student, Prediction.student_id == Student.id)
        .all()
    )

    evaluated_students = len(latest_records)
    unevaluated_students = max(0, total_students - evaluated_students)

    # Risk triage tier counts based on latest evaluation
    low_count = sum(1 for p, _ in latest_records if p.risk_level == "Low")
    medium_count = sum(1 for p, _ in latest_records if p.risk_level == "Medium")
    high_count = sum(1 for p, _ in latest_records if p.risk_level == "High")
    at_risk_count = sum(1 for p, _ in latest_records if p.at_risk_binary == 1)

    # Ratios and percentages (guarded against zero-division)
    if evaluated_students > 0:
        at_risk_pct = round((at_risk_count / evaluated_students) * 100.0, 2)
        avg_prob = round(sum(p.risk_probability for p, _ in latest_records) / evaluated_students, 4)
        low_pct = round((low_count / evaluated_students) * 100.0, 2)
        med_pct = round((medium_count / evaluated_students) * 100.0, 2)
        high_pct = round((high_count / evaluated_students) * 100.0, 2)
    else:
        at_risk_pct = 0.0
        avg_prob = 0.0
        low_pct = 0.0
        med_pct = 0.0
        high_pct = 0.0

    # Partition by educational institution
    school_rows = db.query(Student.school).filter(Student.school.isnot(None)).distinct().all()
    school_dist: List[SchoolDistribution] = []
    for (s_code,) in school_rows:
        if not s_code:
            continue
        s_total = db.query(func.count(Student.id)).filter(Student.school == s_code).scalar() or 0
        s_preds = [p for p, sch in latest_records if sch == s_code]
        s_eval = len(s_preds)
        s_at_risk = sum(1 for p in s_preds if p.at_risk_binary == 1)
        school_dist.append(
            SchoolDistribution(
                school=s_code,
                student_count=s_total,
                evaluated_count=s_eval,
                at_risk_count=s_at_risk,
            )
        )

    # Sort school distribution alphabetically
    school_dist.sort(key=lambda s: s.school)

    return FacultyAnalyticsResponse(
        total_students=total_students,
        evaluated_students=evaluated_students,
        unevaluated_students=unevaluated_students,
        total_predictions=total_predictions,
        at_risk_count=at_risk_count,
        at_risk_percentage=at_risk_pct,
        average_risk_probability=avg_prob,
        risk_distribution=RiskDistribution(
            low=low_count,
            medium=medium_count,
            high=high_count,
        ),
        risk_percentages=RiskPercentages(
            low=low_pct,
            medium=med_pct,
            high=high_pct,
        ),
        school_distribution=school_dist,
        model_version="v1.0.0",
        generated_at=datetime.now(timezone.utc),
    )
