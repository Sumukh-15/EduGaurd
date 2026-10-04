"""Prediction endpoint integrating Phase 1 ML pipeline and SHAP explanations."""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user, require_roles, verify_student_access
from backend.app.db.session import get_db
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.assignment import MentorAssignment
from backend.app.models.explanation import Explanation
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.prediction import (
    BatchPredictItem,
    BatchPredictRequest,
    BatchPredictResponse,
    FactorContributionRead,
    PredictRequest,
    PredictResponse,
)
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


@router.post(
    "/predict/batch",
    response_model=BatchPredictResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch Generate Academic Risk Predictions with SHAP Explanations",
    description=(
        "Evaluates up to 500 students in a single batch request. Restricted to faculty and administrators. "
        "Faculty members may only evaluate students assigned to their mentorship roster; unassigned students "
        "return an access error. Persists immutable Prediction and Explanation records in PostgreSQL (append-only)."
    ),
)
def batch_predict_student_risk(
    payload: BatchPredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("faculty", "admin")),
) -> BatchPredictResponse:
    student_ids = payload.student_ids
    if not student_ids:
        return BatchPredictResponse(total=0, successful=0, failed=0, results=[])

    # 1. Fetch students in the requested batch
    students = db.query(Student).filter(Student.id.in_(student_ids)).all()
    students_by_id = {s.id: s for s in students}

    # 2. Check mentorship scope if faculty
    assigned_student_ids = set()
    if current_user.role == "faculty":
        assigned_rows = (
            db.query(MentorAssignment.student_id)
            .filter(
                MentorAssignment.faculty_user_id == current_user.id,
                MentorAssignment.student_id.in_(student_ids),
            )
            .all()
        )
        assigned_student_ids = {r[0] for r in assigned_rows}
    else:
        # Admin has universal access
        assigned_student_ids = set(students_by_id.keys())

    # 3. Categorize candidates for inference
    failed_items: dict[int, BatchPredictItem] = {}
    valid_candidates: list[tuple[int, Student, AcademicRecord]] = []

    for s_id in student_ids:
        # Check student existence
        if s_id not in students_by_id:
            failed_items[s_id] = BatchPredictItem(
                student_id=s_id,
                success=False,
                error=f"Student with id {s_id} not found",
            )
            continue

        # Check faculty mentorship scoping
        if current_user.role == "faculty" and s_id not in assigned_student_ids:
            failed_items[s_id] = BatchPredictItem(
                student_id=s_id,
                success=False,
                error="Access denied: Student is not assigned to your mentorship roster.",
            )
            continue

        student = students_by_id[s_id]

        # Fetch latest academic record
        latest_record = (
            db.query(AcademicRecord)
            .filter(AcademicRecord.student_id == s_id)
            .order_by(AcademicRecord.recorded_at.desc())
            .first()
        )
        if not latest_record:
            failed_items[s_id] = BatchPredictItem(
                student_id=s_id,
                success=False,
                error="No academic telemetry records found for student.",
            )
            continue

        valid_candidates.append((s_id, student, latest_record))

    # 4. Perform vectorized inference and persist immutable Prediction + Explanation records
    successful_items: dict[int, BatchPredictItem] = {}
    if valid_candidates:
        feature_dicts = [rec.to_ml_feature_dict() for _, _, rec in valid_candidates]
        try:
            ml_results = ml_service.predict_batch(feature_dicts, top_k=5)
            for (s_id, stud, rec), ml_res in zip(valid_candidates, ml_results):
                new_prediction = Prediction(
                    student_id=stud.id,
                    academic_record_id=rec.id,
                    risk_probability=ml_res["risk_probability"],
                    risk_level=ml_res["risk_level"],
                    at_risk_binary=ml_res["at_risk_binary"],
                    model_version=ml_res["model_version"],
                )
                db.add(new_prediction)
                db.flush()

                top_factors_schema: List[FactorContributionRead] = []
                for factor in ml_res["top_factors"]:
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

                pred_response = PredictResponse(
                    prediction_id=new_prediction.id,
                    student_id=stud.id,
                    academic_record_id=rec.id,
                    risk_level=new_prediction.risk_level,
                    risk_probability=new_prediction.risk_probability,
                    at_risk_binary=new_prediction.at_risk_binary,
                    model_version=new_prediction.model_version,
                    created_at=new_prediction.created_at,
                    base_log_odds=ml_res["base_log_odds"],
                    top_factors=top_factors_schema,
                    causal_disclaimer=ml_res["causal_disclaimer"],
                )
                successful_items[s_id] = BatchPredictItem(
                    student_id=s_id,
                    success=True,
                    prediction=pred_response,
                )
            db.commit()
        except Exception as batch_err:
            logger.error("Error executing batch predictions: %s", batch_err, exc_info=True)
            db.rollback()
            for s_id, _, _ in valid_candidates:
                failed_items[s_id] = BatchPredictItem(
                    student_id=s_id,
                    success=False,
                    error=f"Prediction evaluation failed: {str(batch_err)}",
                )

    # 5. Assemble final response in exact requested order
    final_results: List[BatchPredictItem] = []
    for s_id in student_ids:
        if s_id in successful_items:
            final_results.append(successful_items[s_id])
        elif s_id in failed_items:
            final_results.append(failed_items[s_id])

    success_count = sum(1 for item in final_results if item.success)
    failed_count = len(final_results) - success_count

    return BatchPredictResponse(
        total=len(final_results),
        successful=success_count,
        failed=failed_count,
        results=final_results,
    )
