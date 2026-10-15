from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user, require_roles, verify_student_access
from backend.app.db.session import get_db
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.explanation import Explanation
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.academic_data import (
    AcademicRecordCreate,
    AcademicRecordRead,
    FacultyAcademicUpdate,
    StudentSelfReportUpdate,
)
from backend.app.schemas.history import (
    AcademicRecordHistoryItem,
    PredictionHistoryItem,
    StudentHistoryResponse,
)
from backend.app.schemas.prediction import (
    AcademicUpdateResponse,
    FactorContributionRead,
    PredictResponse,
)
from backend.app.schemas.student import StudentDetailRead, StudentRead, StudentUpdate
from backend.app.services.ml_service import ml_service
from backend.app.services.recommendation_service import recommendation_service

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
        factors = [
            FactorContributionRead(
                feature=e.feature_name,
                display_name=e.display_name,
                contribution=e.contribution,
                abs_contribution=abs(e.contribution),
                direction=e.direction,
                raw_value=e.raw_value,
                interpretation=f"Contributes {abs(e.contribution):.2f} log-odds toward {'higher' if e.direction == 'increases_risk' else 'lower'} risk.",
            )
            for e in p.explanations
        ]
        p_item = PredictionHistoryItem(
            id=p.id,
            student_id=p.student_id,
            academic_record_id=p.academic_record_id,
            risk_probability=p.risk_probability,
            risk_level=p.risk_level,
            at_risk_binary=p.at_risk_binary,
            model_version=p.model_version,
            created_at=p.created_at,
            top_factors=factors,
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

    latest_item = None
    if latest_pred:
        latest_factors = [
            FactorContributionRead(
                feature=e.feature_name,
                display_name=e.display_name,
                contribution=e.contribution,
                abs_contribution=abs(e.contribution),
                direction=e.direction,
                raw_value=e.raw_value,
                interpretation=f"Contributes {abs(e.contribution):.2f} log-odds toward {'higher' if e.direction == 'increases_risk' else 'lower'} risk.",
            )
            for e in latest_pred.explanations
        ]
        latest_item = PredictionHistoryItem(
            id=latest_pred.id,
            student_id=latest_pred.student_id,
            academic_record_id=latest_pred.academic_record_id,
            risk_probability=latest_pred.risk_probability,
            risk_level=latest_pred.risk_level,
            at_risk_binary=latest_pred.at_risk_binary,
            model_version=latest_pred.model_version,
            created_at=latest_pred.created_at,
            top_factors=latest_factors,
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


def _run_prediction_for_record(
    db: Session, student: Student, academic_record: AcademicRecord
) -> PredictResponse:
    """Helper to run ML inference + SHAP and persist prediction + explanation records."""
    features_dict = academic_record.to_ml_feature_dict()
    ml_result = ml_service.predict(features_dict, top_k=5)

    new_pred = Prediction(
        student_id=student.id,
        academic_record_id=academic_record.id,
        risk_probability=ml_result["risk_probability"],
        risk_level=ml_result["risk_level"],
        at_risk_binary=ml_result["at_risk_binary"],
        model_version=ml_result["model_version"],
    )
    db.add(new_pred)
    db.flush()

    top_factors_schema: List[FactorContributionRead] = []
    for factor in ml_result["top_factors"]:
        raw_val_str = str(factor["raw_value"]) if factor.get("raw_value") is not None else None
        explanation = Explanation(
            prediction_id=new_pred.id,
            feature_name=factor["feature"],
            display_name=factor["display_name"],
            contribution=factor["contribution"],
            direction=factor["direction"],
            raw_value=raw_val_str,
        )
        db.add(explanation)
        top_factors_schema.append(FactorContributionRead(**factor))

    db.flush()
    # Evaluate deterministic recommendations
    recommendation_service.get_or_create_recommendations(db, student.id, persist=True)

    return PredictResponse(
        prediction_id=new_pred.id,
        student_id=student.id,
        academic_record_id=academic_record.id,
        risk_level=new_pred.risk_level,
        risk_probability=new_pred.risk_probability,
        at_risk_binary=new_pred.at_risk_binary,
        model_version=new_pred.model_version,
        created_at=new_pred.created_at,
        base_log_odds=ml_result["base_log_odds"],
        top_factors=top_factors_schema,
        causal_disclaimer=ml_result["causal_disclaimer"],
    )


@router.post(
    "/{id}/self-reported",
    response_model=AcademicUpdateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Update Student Self-Reported Study Information",
    description=(
        "Students can update their weekly study time allocation and study habits. "
        "Official faculty-verified performance metrics (G1, G2, absences, failures) are preserved intact "
        "and cannot be altered. Triggers risk recalculation and generates explainable advisory support."
    ),
)
def update_student_self_reported(
    id: int,
    payload: StudentSelfReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AcademicUpdateResponse:
    """Record student self-reported study habits while preserving faculty verified marks."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student with id {id} not found")

    verify_student_access(student_id=id, current_user=current_user, db=db)

    # Fetch latest academic record to preserve verified faculty marks and institutional attributes
    latest_rec = (
        db.query(AcademicRecord)
        .filter(AcademicRecord.student_id == id)
        .order_by(AcademicRecord.recorded_at.desc())
        .first()
    )

    if not latest_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No baseline faculty academic record found for this student. A baseline assessment must be recorded by faculty first.",
        )

    # Clone baseline record, preserving verified faculty data (G1, G2, absences, failures)
    cloned_data = {
        "age": latest_rec.age,
        "Medu": latest_rec.Medu,
        "Fedu": latest_rec.Fedu,
        "traveltime": latest_rec.traveltime,
        "failures": latest_rec.failures,
        "famrel": latest_rec.famrel,
        "goout": latest_rec.goout,
        "Dalc": latest_rec.Dalc,
        "Walc": latest_rec.Walc,
        "health": latest_rec.health,
        "absences": latest_rec.absences,
        "G1": latest_rec.G1,
        "G2": latest_rec.G2,
        "school": latest_rec.school,
        "sex": latest_rec.sex,
        "address": latest_rec.address,
        "famsize": latest_rec.famsize,
        "Pstatus": latest_rec.Pstatus,
        "Mjob": latest_rec.Mjob,
        "Fjob": latest_rec.Fjob,
        "reason": latest_rec.reason,
        "guardian": latest_rec.guardian,
        "nursery": latest_rec.nursery,
        "higher": latest_rec.higher,
        "internet": latest_rec.internet,
        "romantic": latest_rec.romantic,
        # Self-reported updates
        "studytime": payload.studytime,
        "freetime": payload.freetime if payload.freetime is not None else latest_rec.freetime,
        "schoolsup": payload.schoolsup if payload.schoolsup is not None else latest_rec.schoolsup,
        "famsup": payload.famsup if payload.famsup is not None else latest_rec.famsup,
        "paid": payload.paid if payload.paid is not None else latest_rec.paid,
        "activities": payload.activities if payload.activities is not None else latest_rec.activities,
        "term": latest_rec.term,
        "subject": latest_rec.subject,
        "assessment_name": "Self-Reported Study Habits Update",
        "data_source": "self_reported",
    }

    new_record = AcademicRecord(student_id=id, **cloned_data)
    db.add(new_record)
    db.flush()

    pred_res: Optional[PredictResponse] = None
    if payload.recalculate_risk:
        pred_res = _run_prediction_for_record(db, student, new_record)

    db.commit()
    db.refresh(new_record)

    return AcademicUpdateResponse(
        student_id=id,
        academic_record=AcademicRecordRead.model_validate(new_record),
        prediction=pred_res,
        message="Self-reported study information updated successfully. Official faculty records preserved.",
    )


@router.post(
    "/{id}/faculty-update",
    response_model=AcademicUpdateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Faculty Verified Academic Assessment",
    description=(
        "Faculty/admin can record new verified marks, attendance, and assessment details. "
        "Preserves existing student demographic context, records data_source='faculty_verified', "
        "and triggers immediate risk recalculation with SHAP explainability."
    ),
)
def create_faculty_academic_update(
    id: int,
    payload: FacultyAcademicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("faculty", "admin")),
) -> AcademicUpdateResponse:
    """Record faculty verified academic marks and attendance with immediate risk reassessment."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student with id {id} not found")

    verify_student_access(student_id=id, current_user=current_user, db=db)

    # Fetch latest record for demographic defaults
    latest_rec = (
        db.query(AcademicRecord)
        .filter(AcademicRecord.student_id == id)
        .order_by(AcademicRecord.recorded_at.desc())
        .first()
    )

    # Calculate normalized score on 0-20 scale
    normalized_grade = round((payload.marks / payload.max_marks) * 20.0, 1)

    if latest_rec:
        # Progression: Previous G2 becomes current G1, new assessment score becomes G2
        prev_g1 = latest_rec.G2
        age = latest_rec.age
        medu = latest_rec.Medu
        fedu = latest_rec.Fedu
        traveltime = latest_rec.traveltime
        studytime = latest_rec.studytime
        failures = latest_rec.failures if normalized_grade >= 10.0 else min(latest_rec.failures + 1, 4)
        famrel = latest_rec.famrel
        freetime = latest_rec.freetime
        goout = latest_rec.goout
        dalc = latest_rec.Dalc
        walc = latest_rec.Walc
        health = latest_rec.health
        school = latest_rec.school
        sex = latest_rec.sex
        address = latest_rec.address
        famsize = latest_rec.famsize
        pstatus = latest_rec.Pstatus
        mjob = latest_rec.Mjob
        fjob = latest_rec.Fjob
        reason = latest_rec.reason
        guardian = latest_rec.guardian
        schoolsup = latest_rec.schoolsup
        famsup = latest_rec.famsup
        paid = latest_rec.paid
        activities = latest_rec.activities
        nursery = latest_rec.nursery
        higher = latest_rec.higher
        internet = latest_rec.internet
        romantic = latest_rec.romantic
    else:
        # Default baseline demographics if first record
        prev_g1 = normalized_grade
        age = 17
        medu = 2
        fedu = 2
        traveltime = 1
        studytime = 2
        failures = 0 if normalized_grade >= 10.0 else 1
        famrel = 4
        freetime = 3
        goout = 3
        dalc = 1
        walc = 1
        health = 4
        school = student.school or "GP"
        sex = "F"
        address = "U"
        famsize = "GT3"
        pstatus = "T"
        mjob = "other"
        fjob = "other"
        reason = "course"
        guardian = "mother"
        schoolsup = "no"
        famsup = "yes"
        paid = "no"
        activities = "yes"
        nursery = "yes"
        higher = "yes"
        internet = "yes"
        romantic = "no"

    new_record = AcademicRecord(
        student_id=id,
        term=payload.term or "Term 2",
        subject=payload.subject,
        assessment_name=payload.assessment_name,
        data_source="faculty_verified",
        G1=prev_g1,
        G2=normalized_grade,
        absences=payload.absences,
        failures=failures,
        age=age,
        Medu=medu,
        Fedu=fedu,
        traveltime=traveltime,
        studytime=studytime,
        famrel=famrel,
        freetime=freetime,
        goout=goout,
        Dalc=dalc,
        Walc=walc,
        health=health,
        school=school,
        sex=sex,
        address=address,
        famsize=famsize,
        Pstatus=pstatus,
        Mjob=mjob,
        Fjob=fjob,
        reason=reason,
        guardian=guardian,
        schoolsup=schoolsup,
        famsup=famsup,
        paid=paid,
        activities=activities,
        nursery=nursery,
        higher=higher,
        internet=internet,
        romantic=romantic,
    )
    db.add(new_record)
    db.flush()

    pred_res: Optional[PredictResponse] = None
    if payload.recalculate_risk:
        pred_res = _run_prediction_for_record(db, student, new_record)

    db.commit()
    db.refresh(new_record)

    return AcademicUpdateResponse(
        student_id=id,
        academic_record=AcademicRecordRead.model_validate(new_record),
        prediction=pred_res,
        message=f"Verified assessment '{payload.assessment_name}' for {payload.subject} recorded successfully.",
    )


