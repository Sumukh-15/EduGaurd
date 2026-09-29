"""Prediction endpoint integrating Phase 1 ML pipeline and SHAP explanations."""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user, verify_student_access
from backend.app.db.session import get_db
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.explanation import Explanation
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.prediction import FactorContributionRead, PredictRequest, PredictResponse
from backend.app.services.ml_service import ml_service, MLModelUnavailableException

logger = logging.getLogger("eduguard.predict")

router = APIRouter(tags=["Predictions"])


@router.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Academic Risk Prediction with SHAP Explanations",
    description=(
        "Evaluates a student's academic telemetry using the Phase 1 serialized Logistic Regression pipeline. "
        "Computes exact Shapley attribution values via LinearSHAP, persists immutable Prediction and Explanation "
        "records in PostgreSQL, and returns dual classification metrics with non-causal advisory context."
    ),
)
def predict_student_risk(
    payload: PredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PredictResponse:
    # 1. Verify student exists
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {payload.student_id} not found",
        )

    # 2. Enforce student ownership boundary
    verify_student_access(student_id=payload.student_id, current_user=current_user, db=db)

    # If student user, prohibit authoring new academic telemetry in the prediction request
    if current_user.role == "student" and payload.academic_data is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot submit new academic telemetry directly. Academic telemetry must be recorded by faculty or administration.",
        )

    # 3. Resolve academic record for inference
    academic_record: AcademicRecord
    if payload.academic_data is not None:
        # Faculty/admin recording new telemetry along with prediction
        record_data = payload.academic_data.model_dump()
        academic_record = AcademicRecord(student_id=student.id, **record_data)
        db.add(academic_record)
        db.flush()
    elif payload.academic_record_id is not None:
        # Evaluate specific existing academic record
        rec = (
            db.query(AcademicRecord)
            .filter(
                AcademicRecord.id == payload.academic_record_id,
                AcademicRecord.student_id == student.id,
            )
            .first()
        )
        if not rec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Academic record with id {payload.academic_record_id} not found for student {student.id}",
            )
        academic_record = rec
    else:
        # Default: evaluate student's latest recorded telemetry
        rec = (
            db.query(AcademicRecord)
            .filter(AcademicRecord.student_id == student.id)
            .order_by(AcademicRecord.recorded_at.desc())
            .first()
        )
        if not rec:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No academic telemetry records found for student. Telemetry must be recorded before generating a prediction.",
            )
        academic_record = rec

    # 4. Extract 32 ML features (G3 is strictly excluded by AcademicRecord schema)
    features_dict = academic_record.to_ml_feature_dict()

    # 5. Invoke ML inference and SHAP explainer
    try:
        ml_result = ml_service.predict(features_dict, top_k=5)
    except MLModelUnavailableException as exc:
        logger.error("Prediction requested but ML service is unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model artifacts are not loaded. Ensure Phase 1 serialization has completed successfully.",
        )
    except ValueError as exc:
        logger.error("Validation error during ML prediction: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    # 6. Persist immutable Prediction record (append-only invariant)
    new_prediction = Prediction(
        student_id=student.id,
        academic_record_id=academic_record.id,
        risk_probability=ml_result["risk_probability"],
        risk_level=ml_result["risk_level"],
        at_risk_binary=ml_result["at_risk_binary"],
        model_version=ml_result["model_version"],
    )
    db.add(new_prediction)
    db.flush()

    # 7. Persist linked SHAP explanations
    top_factors_schema: List[FactorContributionRead] = []
    for factor in ml_result["top_factors"]:
        raw_val_str = str(factor["raw_value"]) if factor.get("raw_value") is not None else None
        explanation = Explanation(
            prediction_id=new_prediction.id,
            feature_name=factor["feature"],
            display_name=factor["display_name"],
            contribution=factor["contribution"],
            direction=factor["direction"],
            raw_value=raw_val_str,
        )
        db.add(explanation)
        top_factors_schema.append(FactorContributionRead(**factor))

    db.commit()
    db.refresh(new_prediction)

    return PredictResponse(
        prediction_id=new_prediction.id,
        student_id=student.id,
        academic_record_id=academic_record.id,
        risk_level=new_prediction.risk_level,
        risk_probability=new_prediction.risk_probability,
        at_risk_binary=new_prediction.at_risk_binary,
        model_version=new_prediction.model_version,
        created_at=new_prediction.created_at,
        base_log_odds=ml_result["base_log_odds"],
        top_factors=top_factors_schema,
        causal_disclaimer=ml_result["causal_disclaimer"],
    )
