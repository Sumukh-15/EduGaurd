"""Recommendation endpoint for EduGuard.

Provides deterministic, rule-based academic advisory interventions for students.
All recommendations are strictly non-causal decision-support suggestions for human advisors.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user, verify_student_access
from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.recommendation import (
    RecommendationRead,
    StudentRecommendationsResponse,
)
from backend.app.services.recommendation_service import (
    ADVISORY_NOTICE,
    recommendation_service,
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get(
    "/{student_id}",
    response_model=StudentRecommendationsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get active deterministic recommendations for a student",
    description=(
        "Retrieves rule-based, non-causal advisory recommendations for the specified student. "
        "Evaluates project-approved heuristics (Grade velocity ΔG < -2, G2 < 10, absences >= 10, "
        "studytime <= 1) against the student's latest academic telemetry and associates them with "
        "the latest prediction context. Students may only access their own recommendations; "
        "faculty and admin users may access any authorized student's recommendations."
    ),
)
def get_student_recommendations(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentRecommendationsResponse:
    """Retrieve or evaluate deterministic recommendations with strict ownership verification."""
    # 1. Verify student existence
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found.",
        )

    # 2. Enforce RBAC and student ownership boundary
    verify_student_access(student_id=student_id, current_user=current_user)

    # 3. Retrieve or evaluate deterministic recommendations
    _, recs, latest_prediction, academic_record = (
        recommendation_service.get_or_create_recommendations(
            db=db,
            student_id=student_id,
            persist=True,
        )
    )

    recs_read: List[RecommendationRead] = [
        RecommendationRead.model_validate(r) for r in recs
    ]

    return StudentRecommendationsResponse(
        student_id=student.id,
        student_code=student.student_code,
        prediction_id=latest_prediction.id if latest_prediction else None,
        academic_record_id=academic_record.id if academic_record else None,
        risk_level=latest_prediction.risk_level if latest_prediction else None,
        risk_probability=latest_prediction.risk_probability if latest_prediction else None,
        total_recommendations=len(recs_read),
        recommendations=recs_read,
        advisory_notice=ADVISORY_NOTICE,
    )
