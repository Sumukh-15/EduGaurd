from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user, require_roles, verify_student_access
from backend.app.db.session import get_db
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.academic_data import AcademicRecordCreate, AcademicRecordRead
from backend.app.schemas.history import (
    AcademicRecordHistoryItem,
    PredictionHistoryItem,
    StudentHistoryResponse,
)
from backend.app.schemas.student import StudentDetailRead, StudentRead, StudentUpdate

router = APIRouter(prefix="/students", tags=["Students"])


@router.get(
    "/{id}",
    response_model=StudentDetailRead,
    summary="Get Student Profile",
    description="Retrieve institutional student profile. Students can only view their own profile; faculty and administrators can view any student.",
)
def get_student_profile(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentDetailRead:
    """Retrieve student profile with strict student-level ownership boundary."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {id} not found",
        )

    # Enforce ownership boundary: student can only view own profile
    verify_student_access(student_id=id, current_user=current_user, db=db)

    return StudentDetailRead(
        id=student.id,
        student_code=student.student_code,
        user_id=student.user_id,
        first_name=student.first_name,
        last_name=student.last_name,
        cohort_year=student.cohort_year,
        school=student.school,
        created_at=student.created_at,
        updated_at=student.updated_at,
        email=student.user.email if student.user else None,
        full_name=student.user.full_name if student.user else None,
    )


@router.patch(
    "/{id}",
    response_model=StudentRead,
    summary="Update Student Profile",
    description="Update permitted demographic attributes. Students can only update their own profile; faculty/admin can update any student. Canonical student_code is immutable.",
)
def update_student_profile(
    id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentRead:
    """Update demographic fields on a student profile."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {id} not found",
        )

    # Enforce ownership boundary
    verify_student_access(student_id=id, current_user=current_user, db=db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return StudentRead.model_validate(student)


@router.get(
    "/{id}/academic-data",
    response_model=List[AcademicRecordRead],
    summary="Get Student Academic Records",
    description="Retrieve chronological academic telemetry records for a student. Students can only view their own records; faculty/admin can view any student.",
)
def get_student_academic_records(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[AcademicRecordRead]:
    """Retrieve all academic records for a student ordered by timestamp descending."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {id} not found",
        )

    # Enforce ownership boundary
    verify_student_access(student_id=id, current_user=current_user, db=db)

    records = (
        db.query(AcademicRecord)
        .filter(AcademicRecord.student_id == id)
        .order_by(AcademicRecord.recorded_at.desc())
        .all()
    )
    return [AcademicRecordRead.model_validate(r) for r in records]


@router.post(
    "/{id}/academic-data",
    response_model=AcademicRecordRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record Student Academic Telemetry",
    description="Record new institutional academic telemetry for a student. Restricted to faculty and administrators. Target label G3 is strictly forbidden.",
)
def create_student_academic_record(
    id: int,
    record_in: AcademicRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("faculty", "admin")),
) -> AcademicRecordRead:
    """Create and persist an official academic telemetry record for a student."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {id} not found",
        )

    verify_student_access(student_id=id, current_user=current_user, db=db)

    record_data = record_in.model_dump()
    new_record = AcademicRecord(
        student_id=id,
        **record_data,
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return AcademicRecordRead.model_validate(new_record)


@router.get(
    "/{id}/history",
    response_model=StudentHistoryResponse,
    summary="Get Student Academic & Risk Trajectory",
    description="Retrieve chronological academic telemetry records and complete prediction history for a student. Students can only view their own history; faculty/admin can view any student.",
)
def get_student_history(
    id: int,
    order: str = Query("asc", pattern="^(asc|desc)$", description="Chronological sort direction ('asc' oldest first, 'desc' newest first)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentHistoryResponse:
    """Retrieve chronological academic records and linked predictions for a student."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {id} not found",
        )

    # Enforce student ownership boundary
    verify_student_access(student_id=id, current_user=current_user, db=db)

    # Query academic records
    rec_query = db.query(AcademicRecord).filter(AcademicRecord.student_id == id)
    if order == "asc":
        academic_records = rec_query.order_by(AcademicRecord.recorded_at.asc()).all()
    else:
        academic_records = rec_query.order_by(AcademicRecord.recorded_at.desc()).all()

    # Query predictions
    pred_query = db.query(Prediction).filter(Prediction.student_id == id)
    if order == "asc":
        predictions = pred_query.order_by(Prediction.created_at.asc()).all()
    else:
        predictions = pred_query.order_by(Prediction.created_at.desc()).all()

    # Most recent prediction for the student
    latest_pred = (
        db.query(Prediction)
        .filter(Prediction.student_id == id)
        .order_by(Prediction.created_at.desc())
        .first()
    )

    # Map predictions to academic_record_id for direct linkage
    preds_by_record: Dict[int, List[PredictionHistoryItem]] = {}
    prediction_items: List[PredictionHistoryItem] = []
    for p in predictions:
        p_item = PredictionHistoryItem(
            id=p.id,
            student_id=p.student_id,
            academic_record_id=p.academic_record_id,
            risk_probability=p.risk_probability,
            risk_level=p.risk_level,
            at_risk_binary=p.at_risk_binary,
            model_version=p.model_version,
            created_at=p.created_at,
        )
        prediction_items.append(p_item)
        if p.academic_record_id is not None:
            if p.academic_record_id not in preds_by_record:
                preds_by_record[p.academic_record_id] = []
            preds_by_record[p.academic_record_id].append(p_item)

    record_items: List[AcademicRecordHistoryItem] = []
    for r in academic_records:
        r_item = AcademicRecordHistoryItem(
            **AcademicRecordRead.model_validate(r).model_dump(),
            predictions=preds_by_record.get(r.id, []),
        )
        record_items.append(r_item)

    latest_item = (
        PredictionHistoryItem(
            id=latest_pred.id,
            student_id=latest_pred.student_id,
            academic_record_id=latest_pred.academic_record_id,
            risk_probability=latest_pred.risk_probability,
            risk_level=latest_pred.risk_level,
            at_risk_binary=latest_pred.at_risk_binary,
            model_version=latest_pred.model_version,
            created_at=latest_pred.created_at,
        )
        if latest_pred
        else None
    )

    return StudentHistoryResponse(
        student_id=student.id,
        student_code=student.student_code,
        first_name=student.first_name,
        last_name=student.last_name,
        cohort_year=student.cohort_year,
        school=student.school,
        total_records=len(record_items),
        total_predictions=len(prediction_items),
        academic_records=record_items,
        predictions=prediction_items,
        latest_prediction=latest_item,
    )

