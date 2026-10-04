from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from backend.app.api.deps import require_roles
from backend.app.db.session import get_db
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.assignment import MentorAssignment
from backend.app.models.explanation import Explanation
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.analytics import (
    ClassAverages,
    FacultyAnalyticsResponse,
    FacultyAnalyticsTrendsResponse,
    RiskDistribution,
    RiskPercentages,
    RiskTrendPoint,
    SchoolDistribution,
    WorseningStudentItem,
)
from backend.app.schemas.faculty_students import (
    FacultyStudentItem,
    FacultyStudentsListResponse,
)
from backend.app.services.ml_service import ml_service

router = APIRouter(prefix="/faculty", tags=["Faculty"])


def _compute_class_averages(db: Session, scoped_student_ids: Optional[List[int]]) -> ClassAverages:
    """Compute class-level telemetry averages using each student's latest academic record."""
    if scoped_student_ids is not None and len(scoped_student_ids) == 0:
        return ClassAverages()

    latest_rec_subq = db.query(
        AcademicRecord.student_id.label("student_id"),
        func.max(AcademicRecord.id).label("max_id"),
    )
    if scoped_student_ids is not None:
        latest_rec_subq = latest_rec_subq.filter(AcademicRecord.student_id.in_(scoped_student_ids))
    latest_rec_subq = latest_rec_subq.group_by(AcademicRecord.student_id).subquery()

    latest_records_q = (
        db.query(AcademicRecord)
        .join(latest_rec_subq, AcademicRecord.id == latest_rec_subq.c.max_id)
    )
    if scoped_student_ids is not None:
        latest_records_q = latest_records_q.filter(AcademicRecord.student_id.in_(scoped_student_ids))
    records = latest_records_q.all()

    if not records:
        return ClassAverages(
            avg_g1=0.0,
            avg_g2=0.0,
            avg_grade_velocity=0.0,
            avg_absences=0.0,
            chronic_absenteeism_pct=0.0,
            failures_pct=0.0,
            total_students_with_records=0,
        )

    n = len(records)
    avg_g1 = round(sum(r.G1 for r in records) / n, 2)
    avg_g2 = round(sum(r.G2 for r in records) / n, 2)
    avg_velocity = round(sum((r.G2 - r.G1) for r in records) / n, 2)
    avg_absences = round(sum(r.absences for r in records) / n, 2)
    chronic_absenteeism_pct = round((sum(1 for r in records if r.absences >= 10) / n) * 100.0, 2)
    failures_pct = round((sum(1 for r in records if r.failures > 0) / n) * 100.0, 2)

    return ClassAverages(
        avg_g1=avg_g1,
        avg_g2=avg_g2,
        avg_grade_velocity=avg_velocity,
        avg_absences=avg_absences,
        chronic_absenteeism_pct=chronic_absenteeism_pct,
        failures_pct=failures_pct,
        total_students_with_records=n,
    )


def _compute_risk_trend_and_worsening(
    db: Session,
    scoped_student_ids: Optional[List[int]],
    bucket: str = "day",
) -> tuple[List[RiskTrendPoint], int, List[WorseningStudentItem]]:
    """Compute point-in-time risk distribution trajectory and identify students with worsening risk."""
    if scoped_student_ids is not None and len(scoped_student_ids) == 0:
        return [], 0, []

    pred_query = db.query(Prediction).order_by(Prediction.created_at.asc(), Prediction.id.asc())
    if scoped_student_ids is not None:
        pred_query = pred_query.filter(Prediction.student_id.in_(scoped_student_ids))
    all_preds = pred_query.all()

    if not all_preds:
        return [], 0, []

    # Map bucket dates
    preds_by_bucket: dict[str, list[Prediction]] = defaultdict(list)
    preds_by_student: dict[int, list[Prediction]] = defaultdict(list)

    for p in all_preds:
        preds_by_student[p.student_id].append(p)
        created_dt = p.created_at or datetime.now(timezone.utc)
        dt = created_dt.date() if hasattr(created_dt, "date") else created_dt
        if bucket == "week":
            monday = dt - timedelta(days=dt.weekday())
            b_key = monday.strftime("%Y-%m-%d")
        else:
            b_key = dt.strftime("%Y-%m-%d")
        preds_by_bucket[b_key].append(p)

    sorted_bucket_keys = sorted(preds_by_bucket.keys())
    active_preds: dict[int, Prediction] = {}
    trend_points: list[RiskTrendPoint] = []

    for b_key in sorted_bucket_keys:
        for p in preds_by_bucket[b_key]:
            active_preds[p.student_id] = p
        low = sum(1 for p in active_preds.values() if p.risk_level == "Low")
        med = sum(1 for p in active_preds.values() if p.risk_level == "Medium")
        high = sum(1 for p in active_preds.values() if p.risk_level == "High")
        trend_points.append(
            RiskTrendPoint(
                date=b_key,
                low=low,
                medium=med,
                high=high,
                total_evaluated=len(active_preds),
            )
        )

    # Students worsening: latest risk probability increased by >= 0.15 vs previous
    student_q = db.query(Student.id, Student.student_code)
    if scoped_student_ids is not None:
        student_q = student_q.filter(Student.id.in_(scoped_student_ids))
    code_map = {s_id: s_code for s_id, s_code in student_q.all()}

    worsening_items: list[WorseningStudentItem] = []
    for s_id, s_preds in preds_by_student.items():
        if len(s_preds) >= 2:
            prev_p = s_preds[-2]
            latest_p = s_preds[-1]
            delta = round(latest_p.risk_probability - prev_p.risk_probability, 4)
            if delta >= 0.15:
                worsening_items.append(
                    WorseningStudentItem(
                        student_id=s_id,
                        student_code=code_map.get(s_id, f"STU-{s_id}"),
                        previous_risk_probability=round(prev_p.risk_probability, 4),
                        latest_risk_probability=round(latest_p.risk_probability, 4),
                        risk_delta=round(delta, 4),
                        previous_risk_level=prev_p.risk_level,
                        latest_risk_level=latest_p.risk_level,
                    )
                )
    worsening_items.sort(key=lambda item: item.risk_delta, reverse=True)

    return trend_points, len(worsening_items), worsening_items


@router.get(
    "/analytics",
    response_model=FacultyAnalyticsResponse,
    summary="Get Faculty Cohort Analytics",
    description="Retrieve aggregate, non-identifying cohort risk distributions, class averages, and monitoring statistics. Strictly restricted to faculty and administrator roles.",
)
def get_faculty_analytics(
    bucket: str = Query("day", pattern="^(day|week)$", description="Date grouping bucket for risk trends ('day' or 'week')"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("faculty", "admin")),
) -> FacultyAnalyticsResponse:
    """Compute aggregate risk metrics across the student population (scoped to assigned students for faculty)."""
    if current_user.role == "faculty":
        assigned_student_ids = [
            r[0]
            for r in db.query(MentorAssignment.student_id)
            .filter(MentorAssignment.faculty_user_id == current_user.id)
            .all()
        ]
        if not assigned_student_ids:
            return FacultyAnalyticsResponse(
                total_students=0,
                evaluated_students=0,
                unevaluated_students=0,
                total_predictions=0,
                at_risk_count=0,
                at_risk_percentage=0.0,
                average_risk_probability=0.0,
                risk_distribution=RiskDistribution(low=0, medium=0, high=0),
                risk_percentages=RiskPercentages(low=0.0, medium=0.0, high=0.0),
                school_distribution=[],
                class_averages=ClassAverages(),
                risk_trend=[],
                students_worsening_count=0,
                students_worsening=[],
                model_version=ml_service.model_version,
                generated_at=datetime.now(timezone.utc),
            )

        total_students = len(assigned_student_ids)
        total_predictions = (
            db.query(func.count(Prediction.id))
            .filter(Prediction.student_id.in_(assigned_student_ids))
            .scalar()
            or 0
        )
        latest_pred_subq = (
            db.query(
                Prediction.student_id,
                func.max(Prediction.id).label("max_id"),
            )
            .filter(Prediction.student_id.in_(assigned_student_ids))
            .group_by(Prediction.student_id)
            .subquery()
        )
        latest_records = (
            db.query(Prediction, Student.school)
            .join(latest_pred_subq, Prediction.id == latest_pred_subq.c.max_id)
            .join(Student, Prediction.student_id == Student.id)
            .filter(Student.id.in_(assigned_student_ids))
            .all()
        )
        school_rows = (
            db.query(Student.school)
            .filter(Student.school.isnot(None), Student.id.in_(assigned_student_ids))
            .distinct()
            .all()
        )
        school_dist: List[SchoolDistribution] = []
        for (s_code,) in school_rows:
            if not s_code:
                continue
            s_total = (
                db.query(func.count(Student.id))
                .filter(Student.school == s_code, Student.id.in_(assigned_student_ids))
                .scalar()
                or 0
            )
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
        scoped_ids = assigned_student_ids
    else:
        # Admin: universal institutional analytics
        total_students = db.query(func.count(Student.id)).scalar() or 0
        total_predictions = db.query(func.count(Prediction.id)).scalar() or 0

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
        scoped_ids = None

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

    # Sort school distribution alphabetically
    school_dist.sort(key=lambda s: s.school)

    # Compute class averages, risk trend, and worsening students
    class_averages = _compute_class_averages(db, scoped_ids)
    risk_trend, worsening_count, worsening_students = _compute_risk_trend_and_worsening(
        db, scoped_ids, bucket=bucket
    )

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
        class_averages=class_averages,
        risk_trend=risk_trend,
        students_worsening_count=worsening_count,
        students_worsening=worsening_students,
        model_version=ml_service.model_version,
        generated_at=datetime.now(timezone.utc),
    )


@router.get(
    "/analytics/trends",
    response_model=FacultyAnalyticsTrendsResponse,
    summary="Get Faculty Cohort Risk Trends and Class Averages",
    description="Retrieve longitudinal cohort risk distribution time series, class telemetry averages, and worsening student counts.",
)
def get_faculty_analytics_trends(
    bucket: str = Query("day", pattern="^(day|week)$", description="Date grouping bucket for risk trends ('day' or 'week')"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("faculty", "admin")),
) -> FacultyAnalyticsTrendsResponse:
    """Retrieve risk trends, class performance averages, and deteriorating student tracking."""
    if current_user.role == "faculty":
        assigned_student_ids = [
            r[0]
            for r in db.query(MentorAssignment.student_id)
            .filter(MentorAssignment.faculty_user_id == current_user.id)
            .all()
        ]
        if not assigned_student_ids:
            return FacultyAnalyticsTrendsResponse(
                bucket=bucket,
                risk_trend=[],
                class_averages=ClassAverages(),
                students_worsening_count=0,
                students_worsening=[],
                generated_at=datetime.now(timezone.utc),
            )
        scoped_ids = assigned_student_ids
    else:
        scoped_ids = None

    class_averages = _compute_class_averages(db, scoped_ids)
    risk_trend, worsening_count, worsening_students = _compute_risk_trend_and_worsening(
        db, scoped_ids, bucket=bucket
    )

    return FacultyAnalyticsTrendsResponse(
        bucket=bucket,
        risk_trend=risk_trend,
        class_averages=class_averages,
        students_worsening_count=worsening_count,
        students_worsening=worsening_students,
        generated_at=datetime.now(timezone.utc),
    )


@router.get(
    "/students",
    response_model=FacultyStudentsListResponse,
    summary="Browse Cohort Students & Risk Triage",
    description="Retrieve paginated student cohort directory with latest risk evaluations and top contributing SHAP factors. Accessible only by faculty and admin roles.",
)
def get_faculty_students(
    risk_level: Optional[str] = Query(
        None,
        pattern="^(Low|Medium|High)$",
        description="Filter by risk tier: Low, Medium, High",
    ),
    at_risk: Optional[bool] = Query(
        None,
        description="Filter by binary classification (true: at-risk >= 0.50, false: safe < 0.50)",
    ),
    school: Optional[str] = Query(
        None,
        description="Filter by institutional school code (e.g. GP, MS)",
    ),
    search: Optional[str] = Query(
        None,
        description="Case-insensitive substring search matching student_code",
    ),
    evaluated: Optional[bool] = Query(
        None,
        description="Filter by evaluation status (true: evaluated, false: pending initial evaluation)",
    ),
    sort: str = Query(
        "risk_desc",
        pattern="^(risk_desc|risk_asc|student_code)$",
        description="Sorting strategy: risk_desc (default), risk_asc, student_code",
    ),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("faculty", "admin")),
) -> FacultyStudentsListResponse:
    """Browse and filter enrolled students with their latest risk evaluations."""
    # 1. Subquery for latest prediction ID per student
    latest_pred_subq = (
        db.query(
            Prediction.student_id.label("student_id"),
            func.max(Prediction.id).label("max_id"),
        )
        .group_by(Prediction.student_id)
        .subquery()
    )

    # 2. Correlated scalar subquery for top SHAP factor display name
    top_factor_subq = (
        db.query(Explanation.display_name)
        .filter(Explanation.prediction_id == Prediction.id)
        .order_by(func.abs(Explanation.contribution).desc(), Explanation.id.asc())
        .limit(1)
        .scalar_subquery()
    )

    # 3. Build filter conditions
    filter_conditions = []
    if current_user.role == "faculty":
        filter_conditions.append(
            Student.id.in_(
                db.query(MentorAssignment.student_id).filter(
                    MentorAssignment.faculty_user_id == current_user.id
                )
            )
        )

    if risk_level:
        filter_conditions.append(Prediction.risk_level == risk_level)

    if at_risk is not None:
        binary_val = 1 if at_risk else 0
        filter_conditions.append(Prediction.at_risk_binary == binary_val)

    if school:
        filter_conditions.append(Student.school == school.strip())

    if search:
        search_pattern = f"%{search.strip()}%"
        filter_conditions.append(Student.student_code.ilike(search_pattern))

    if evaluated is not None:
        if evaluated:
            filter_conditions.append(Prediction.id.isnot(None))
        else:
            filter_conditions.append(Prediction.id.is_(None))

    # 4. Total count query (avoids calculating SHAP top factor scalar subquery during count)
    count_query = (
        db.query(func.count(Student.id))
        .outerjoin(latest_pred_subq, Student.id == latest_pred_subq.c.student_id)
        .outerjoin(Prediction, Prediction.id == latest_pred_subq.c.max_id)
    )
    if filter_conditions:
        count_query = count_query.filter(*filter_conditions)
    total = count_query.scalar() or 0

    # 5. Data query with projection
    data_query = (
        db.query(
            Student.id.label("id"),
            Student.student_code.label("student_code"),
            Student.school.label("school"),
            Prediction.risk_level.label("latest_risk_level"),
            Prediction.risk_probability.label("latest_risk_probability"),
            Prediction.created_at.label("latest_prediction_date"),
            top_factor_subq.label("top_factor_label"),
            case((Prediction.id.isnot(None), True), else_=False).label("evaluated"),
        )
        .outerjoin(latest_pred_subq, Student.id == latest_pred_subq.c.student_id)
        .outerjoin(Prediction, Prediction.id == latest_pred_subq.c.max_id)
    )
    if filter_conditions:
        data_query = data_query.filter(*filter_conditions)

    # 6. Sorting strategy
    eval_sort_order = case((Prediction.id.isnot(None), 0), else_=1)
    if sort == "risk_desc":
        data_query = data_query.order_by(
            eval_sort_order.asc(),
            Prediction.risk_probability.desc(),
            Student.student_code.asc(),
        )
    elif sort == "risk_asc":
        data_query = data_query.order_by(
            eval_sort_order.asc(),
            Prediction.risk_probability.asc(),
            Student.student_code.asc(),
        )
    elif sort == "student_code":
        data_query = data_query.order_by(Student.student_code.asc())

    # 7. Pagination
    offset = (page - 1) * page_size
    rows = data_query.offset(offset).limit(page_size).all()

    items = [
        FacultyStudentItem(
            id=row.id,
            student_code=row.student_code,
            school=row.school,
            latest_risk_level=row.latest_risk_level,
            latest_risk_probability=round(row.latest_risk_probability, 4)
            if row.latest_risk_probability is not None
            else None,
            latest_prediction_date=row.latest_prediction_date,
            top_factor_label=row.top_factor_label,
            evaluated=row.evaluated,
        )
        for row in rows
    ]

    return FacultyStudentsListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
