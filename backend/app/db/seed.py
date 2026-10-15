"""Database seeding utility for test, development, and realistic product demo workflows.

Idempotently creates standard test accounts and realistic student cohorts:
  - student@school.edu (linked to STU-1001: Student A - Low risk / Improving)
  - student2@school.edu (linked to STU-1002: Student B - Medium risk / Declining slightly)
  - student3@school.edu (linked to STU-1003: Student C - High risk / Severe decline & attendance issue)
  - STU-1004 (Student D - Low risk / Stable high performance)
  - Realistic cohort students STU-1005 to STU-1024
  - faculty@school.edu (assigned mentor for the student cohort)
  - faculty2@school.edu (unassigned faculty for testing empty roster scope)
  - admin@school.edu (global institutional administrator)

All predictions and SHAP explanations are computed strictly via the live ml_service pipeline.
Zero fake probabilities are hardcoded.
"""

from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, List
from sqlalchemy.orm import Session

from backend.app.core.security import get_password_hash
from backend.app.db.session import SessionLocal
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.assignment import MentorAssignment
from backend.app.models.explanation import Explanation
from backend.app.models.prediction import Prediction
from backend.app.models.recommendation import Recommendation
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.services.ml_service import ml_service
from backend.app.services.recommendation_service import recommendation_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eduguard.seed")


def _record_academic_and_predict(
    db: Session,
    student: Student,
    rec_data: Dict[str, Any],
    recorded_at: datetime,
) -> Prediction:
    """Helper to persist an academic record, compute real ML inference & SHAP, and persist predictions."""
    record = AcademicRecord(
        student_id=student.id,
        recorded_at=recorded_at,
        **rec_data,
    )
    db.add(record)
    db.flush()

    # Run genuine ML inference using serialized model
    features_dict = record.to_ml_feature_dict()
    ml_result = ml_service.predict(features_dict, top_k=5)

    pred = Prediction(
        student_id=student.id,
        academic_record_id=record.id,
        risk_probability=ml_result["risk_probability"],
        risk_level=ml_result["risk_level"],
        at_risk_binary=ml_result["at_risk_binary"],
        model_version=ml_result["model_version"],
        created_at=recorded_at + timedelta(seconds=2),
    )
    db.add(pred)
    db.flush()

    for factor in ml_result["top_factors"]:
        raw_val_str = str(factor["raw_value"]) if factor.get("raw_value") is not None else None
        exp = Explanation(
            prediction_id=pred.id,
            feature_name=factor["feature"],
            display_name=factor["display_name"],
            contribution=factor["contribution"],
            direction=factor["direction"],
            raw_value=raw_val_str,
        )
        db.add(exp)

    db.flush()
    # Evaluate deterministic recommendations
    recommendation_service.get_or_create_recommendations(db, student.id, persist=True)
    return pred


def seed_test_data(db: Session) -> dict:
    """Idempotently seed test users, realistic student profiles, and longitudinal trajectories."""
    # Ensure ML artifacts are loaded
    if not ml_service.is_ready:
        ml_service.load_artifacts()

    seeded_users = {}

    # 1. Standard test account configurations
    test_accounts = [
        {
            "email": "student@school.edu",
            "full_name": "Alice Chen",
            "role": "student",
            "password": "TestStudent123!",
            "student_code": "STU-1001",
            "first_name": "Alice",
            "last_name": "Chen",
            "cohort_year": 2026,
            "school": "GP",
        },
        {
            "email": "student2@school.edu",
            "full_name": "Marcus Vance",
            "role": "student",
            "password": "TestStudent123!",
            "student_code": "STU-1002",
            "first_name": "Marcus",
            "last_name": "Vance",
            "cohort_year": 2026,
            "school": "GP",
        },
        {
            "email": "student3@school.edu",
            "full_name": "Sophia Rodriguez",
            "role": "student",
            "password": "TestStudent123!",
            "student_code": "STU-1003",
            "first_name": "Sophia",
            "last_name": "Rodriguez",
            "cohort_year": 2026,
            "school": "MS",
        },
        {
            "email": "faculty@school.edu",
            "full_name": "Dr. Sarah Jenkins",
            "role": "faculty",
            "password": "TestFaculty123!",
            "student_code": None,
        },
        {
            "email": "faculty2@school.edu",
            "full_name": "Prof. Alan Turing",
            "role": "faculty",
            "password": "TestFaculty456!",
            "student_code": None,
        },
        {
            "email": "admin@school.edu",
            "full_name": "Admin Director Patel",
            "role": "admin",
            "password": "TestAdmin123!",
            "student_code": None,
        },
    ]

    for acc in test_accounts:
        user = db.query(User).filter(User.email == acc["email"]).first()
        if not user:
            user = User(
                email=acc["email"],
                hashed_password=get_password_hash(acc["password"]),
                full_name=acc["full_name"],
                role=acc["role"],
                is_active=True,
            )
            db.add(user)
            db.flush()
            logger.info("Created user: %s (role=%s)", user.email, user.role)
        else:
            user.full_name = acc["full_name"]
            db.flush()

        if acc["student_code"]:
            student = db.query(Student).filter(Student.student_code == acc["student_code"]).first()
            if not student:
                student = Student(
                    student_code=acc["student_code"],
                    user_id=user.id,
                    first_name=acc["first_name"],
                    last_name=acc["last_name"],
                    cohort_year=acc["cohort_year"],
                    school=acc["school"],
                )
                db.add(student)
                db.flush()
                logger.info("Created student profile %s linked to %s", student.student_code, user.email)
            else:
                student.user_id = user.id
                student.first_name = acc["first_name"]
                student.last_name = acc["last_name"]
                db.flush()

        seeded_users[acc["role"]] = user.email

    # Additional primary student for Student D (STU-1004)
    stu_1004 = db.query(Student).filter(Student.student_code == "STU-1004").first()
    if not stu_1004:
        stu_1004 = Student(
            student_code="STU-1004",
            user_id=None,
            first_name="David",
            last_name="Kim",
            cohort_year=2026,
            school="GP",
        )
        db.add(stu_1004)
        db.flush()

    # 2. Seed Realistic Longitudinal Trajectories for Demo Students A, B, C, D
    # Base demographic template
    base_demographics = {
        "age": 17,
        "Medu": 3,
        "Fedu": 3,
        "traveltime": 1,
        "famrel": 4,
        "freetime": 3,
        "goout": 2,
        "Dalc": 1,
        "Walc": 1,
        "health": 5,
        "school": "GP",
        "sex": "F",
        "address": "U",
        "famsize": "GT3",
        "Pstatus": "T",
        "Mjob": "services",
        "Fjob": "other",
        "reason": "course",
        "guardian": "mother",
        "schoolsup": "no",
        "famsup": "yes",
        "paid": "no",
        "activities": "yes",
        "nursery": "yes",
        "higher": "yes",
        "internet": "yes",
        "romantic": "no",
    }

    now = datetime.now(timezone.utc)

    # Clean existing records for the 4 core demo students to eliminate stale repeated test artifacts
    demo_students = db.query(Student).filter(Student.student_code.in_(["STU-1001", "STU-1002", "STU-1003", "STU-1004"])).all()
    for s in demo_students:
        db.query(Explanation).filter(Explanation.prediction_id.in_(
            db.query(Prediction.id).filter(Prediction.student_id == s.id)
        )).delete(synchronize_session=False)
        db.query(Recommendation).filter(Recommendation.student_id == s.id).delete(synchronize_session=False)
        db.query(Prediction).filter(Prediction.student_id == s.id).delete(synchronize_session=False)
        db.query(AcademicRecord).filter(AcademicRecord.student_id == s.id).delete(synchronize_session=False)
    db.flush()

    # --- Student A (STU-1001, Alice Chen): Low risk / Improving ---
    s1 = db.query(Student).filter(Student.student_code == "STU-1001").first()
    if s1:
        # Step 1: 4 weeks ago - Initial baseline
        _record_academic_and_predict(
            db, s1,
            dict(base_demographics, G1=11.0, G2=12.0, absences=6, studytime=2, failures=0,
                 term="Term 1", subject="Mathematics", assessment_name="Diagnostic Midterm", data_source="faculty_verified"),
            now - timedelta(days=28)
        )
        # Step 2: 2 weeks ago - Improved study habits & marks
        _record_academic_and_predict(
            db, s1,
            dict(base_demographics, G1=12.0, G2=13.5, absences=4, studytime=3, failures=0,
                 term="Term 1", subject="Mathematics", assessment_name="Midterm Exam 2", data_source="faculty_verified"),
            now - timedelta(days=14)
        )
        # Step 3: 2 days ago - Strong improvement / high study time
        _record_academic_and_predict(
            db, s1,
            dict(base_demographics, G1=13.5, G2=15.0, absences=2, studytime=3, failures=0,
                 term="Term 2", subject="Mathematics", assessment_name="Term 2 Progress Check", data_source="faculty_verified"),
            now - timedelta(days=2)
        )
        # Step 4: Today - Student self-reported study habits update
        _record_academic_and_predict(
            db, s1,
            dict(base_demographics, G1=13.5, G2=15.0, absences=2, studytime=4, failures=0, activities="yes",
                 term="Term 2", subject="Mathematics", assessment_name="Self-Reported Study Habits Update", data_source="self_reported"),
            now
        )
        logger.info("Seeded Student A (STU-1001) trajectory: Low risk / Improving")

    # --- Student B (STU-1002, Marcus Vance): Medium risk / Declining slightly ---
    s2 = db.query(Student).filter(Student.student_code == "STU-1002").first()
    if s2:
        # Step 1: 3 weeks ago - Acceptable performance
        _record_academic_and_predict(
            db, s2,
            dict(base_demographics, sex="M", G1=13.0, G2=12.0, absences=4, studytime=2, failures=0,
                 term="Term 1", subject="Mathematics", assessment_name="Midterm 1", data_source="faculty_verified"),
            now - timedelta(days=21)
        )
        # Step 2: 5 days ago - Declining marks and lower study time
        _record_academic_and_predict(
            db, s2,
            dict(base_demographics, sex="M", G1=12.0, G2=9.5, absences=8, studytime=1, failures=1,
                 term="Term 2", subject="Mathematics", assessment_name="Midterm 2", data_source="faculty_verified"),
            now - timedelta(days=5)
        )
        logger.info("Seeded Student B (STU-1002) trajectory: Medium risk / Declining slightly")

    # --- Student C (STU-1003, Sophia Rodriguez): High risk / Severe decline + attendance problem ---
    s3 = db.query(Student).filter(Student.student_code == "STU-1003").first()
    if s3:
        # Step 1: 5 weeks ago - Average baseline
        _record_academic_and_predict(
            db, s3,
            dict(base_demographics, school="MS", G1=12.0, G2=11.0, absences=4, studytime=2, failures=0,
                 term="Term 1", subject="Science", assessment_name="Unit 1 Exam", data_source="faculty_verified"),
            now - timedelta(days=35)
        )
        # Step 2: 3 weeks ago - Sharp drop in attendance and score
        _record_academic_and_predict(
            db, s3,
            dict(base_demographics, school="MS", G1=11.0, G2=8.5, absences=10, studytime=1, failures=1,
                 term="Term 1", subject="Science", assessment_name="Midterm Exam", data_source="faculty_verified"),
            now - timedelta(days=21)
        )
        # Step 3: 4 days ago - Severe absenteeism and failure
        _record_academic_and_predict(
            db, s3,
            dict(base_demographics, school="MS", G1=8.5, G2=6.0, absences=16, studytime=1, failures=2,
                 term="Term 2", subject="Science", assessment_name="Comprehensive Assessment", data_source="faculty_verified"),
            now - timedelta(days=4)
        )
        logger.info("Seeded Student C (STU-1003) trajectory: High risk / Severe decline & attendance issue")

    # --- Student D (STU-1004, David Kim): Low risk / Stable high performance ---
    s4 = db.query(Student).filter(Student.student_code == "STU-1004").first()
    if s4:
        # Step 1: 3 weeks ago - Excellent baseline
        _record_academic_and_predict(
            db, s4,
            dict(base_demographics, sex="M", G1=16.0, G2=16.5, absences=2, studytime=3, failures=0,
                 term="Term 1", subject="Mathematics", assessment_name="Midterm 1", data_source="faculty_verified"),
            now - timedelta(days=21)
        )
        # Step 2: 3 days ago - Consistently high performance
        _record_academic_and_predict(
            db, s4,
            dict(base_demographics, sex="M", G1=16.5, G2=17.0, absences=1, studytime=4, failures=0,
                 term="Term 2", subject="Mathematics", assessment_name="Midterm 2", data_source="faculty_verified"),
            now - timedelta(days=3)
        )
        logger.info("Seeded Student D (STU-1004) trajectory: Low risk / Stable high performance")

    # 3. Seed Additional Realistic Cohort Students (STU-1005 to STU-1025)
    cohort_profiles = [
        ("STU-1005", "Emma", "Watson", "GP", 14.0, 15.0, 3, 3, 0),
        ("STU-1006", "Liam", "Johnson", "GP", 10.0, 11.0, 5, 2, 0),
        ("STU-1007", "Noah", "Williams", "GP", 9.0, 8.5, 9, 1, 1),
        ("STU-1008", "Olivia", "Brown", "GP", 15.5, 16.0, 1, 3, 0),
        ("STU-1009", "Ethan", "Jones", "GP", 7.0, 6.5, 14, 1, 2),
        ("STU-1010", "Ava", "Garcia", "GP", 12.0, 13.0, 4, 2, 0),
        ("STU-1011", "Lucas", "Miller", "GP", 11.0, 10.0, 7, 2, 0),
        ("STU-1012", "Mia", "Davis", "MS", 13.0, 14.0, 2, 3, 0),
        ("STU-1013", "Benjamin", "Martinez", "MS", 8.0, 7.5, 12, 1, 2),
        ("STU-1014", "Charlotte", "Hernandez", "MS", 16.0, 17.5, 0, 4, 0),
        ("STU-1015", "Oliver", "Lopez", "MS", 10.5, 9.0, 8, 1, 1),
        ("STU-1016", "Amelia", "Gonzalez", "MS", 13.5, 13.0, 4, 2, 0),
        ("STU-1017", "Elijah", "Wilson", "GP", 6.0, 5.5, 18, 1, 3),
        ("STU-1018", "Harper", "Anderson", "GP", 14.5, 15.0, 2, 3, 0),
        ("STU-1019", "James", "Thomas", "GP", 11.5, 12.0, 4, 2, 0),
        ("STU-1020", "Evelyn", "Taylor", "GP", 9.5, 8.0, 11, 1, 1),
        ("STU-1021", "Alexander", "Moore", "MS", 15.0, 15.5, 1, 3, 0),
        ("STU-1022", "Abigail", "Jackson", "MS", 12.0, 11.5, 6, 2, 0),
        ("STU-1023", "Daniel", "Martin", "MS", 8.5, 7.0, 13, 1, 2),
        ("STU-1024", "Emily", "Lee", "GP", 5.5, 5.0, 20, 1, 3),  # High risk demo student
        ("STU-1025", "Henry", "Perez", "GP", 17.0, 18.0, 1, 4, 0),
    ]

    all_faculty_assigned_students = [s1.id, s2.id, s3.id, stu_1004.id]

    for code, fname, lname, school, g1, g2, abs_cnt, stime, fails in cohort_profiles:
        st = db.query(Student).filter(Student.student_code == code).first()
        if not st:
            st = Student(
                student_code=code,
                first_name=fname,
                last_name=lname,
                school=school,
                cohort_year=2026,
            )
            db.add(st)
            db.flush()

        all_faculty_assigned_students.append(st.id)

        # If student has no records, create initial telemetry + prediction
        if not st.academic_records:
            _record_academic_and_predict(
                db, st,
                dict(base_demographics, school=school, G1=g1, G2=g2, absences=abs_cnt, studytime=stime, failures=fails,
                     term="Term 2", subject="Mathematics", assessment_name="Midterm Assessment", data_source="faculty_verified"),
                now - timedelta(days=2)
            )

    # 4. Mentor Assignments: Assign faculty@school.edu to all cohort students
    faculty_user = db.query(User).filter(User.email == "faculty@school.edu").first()
    if faculty_user:
        for sid in all_faculty_assigned_students:
            exists = (
                db.query(MentorAssignment)
                .filter(
                    MentorAssignment.faculty_user_id == faculty_user.id,
                    MentorAssignment.student_id == sid,
                )
                .first()
            )
            if not exists:
                db.add(MentorAssignment(faculty_user_id=faculty_user.id, student_id=sid))
                db.flush()

    db.commit()
    logger.info("Database seeding with realistic demo cohorts completed successfully.")
    return seeded_users


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_test_data(db)
    finally:
        db.close()
