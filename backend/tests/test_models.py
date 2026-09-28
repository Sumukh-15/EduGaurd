"""Tests for SQLAlchemy database models, relationships, and constraints."""

from datetime import datetime, timezone
import pytest
from sqlalchemy.exc import IntegrityError

from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.prediction import Prediction
from backend.app.models.explanation import Explanation
from backend.app.models.recommendation import Recommendation


def create_sample_academic_record_dict():
    """Helper returning 32 valid raw features for an AcademicRecord."""
    return {
        "term": "Term 1",
        "age": 16,
        "Medu": 3,
        "Fedu": 2,
        "traveltime": 1,
        "studytime": 2,
        "failures": 0,
        "famrel": 4,
        "freetime": 3,
        "goout": 3,
        "Dalc": 1,
        "Walc": 1,
        "health": 5,
        "absences": 4,
        "G1": 12.0,
        "G2": 13.0,
        "school": "GP",
        "sex": "F",
        "address": "U",
        "famsize": "GT3",
        "Pstatus": "T",
        "schoolsup": "no",
        "famsup": "yes",
        "paid": "no",
        "activities": "yes",
        "nursery": "yes",
        "higher": "yes",
        "internet": "yes",
        "romantic": "no",
        "Mjob": "other",
        "Fjob": "other",
        "reason": "course",
        "guardian": "mother",
    }


def test_user_creation_and_unique_email(db_session):
    """Verify User creation, defaults, and unique email constraint."""
    user = User(
        email="faculty@school.edu",
        hashed_password="hashed_pw_test",
        full_name="Dr. Jane Smith",
        role="faculty",
    )
    db_session.add(user)
    db_session.commit()

    assert user.id is not None
    assert user.role == "faculty"
    assert user.is_active is True
    assert user.created_at is not None

    # Duplicate email must raise IntegrityError
    dup_user = User(
        email="faculty@school.edu",
        hashed_password="another_hash",
        full_name="Duplicate User",
        role="faculty",
    )
    db_session.add(dup_user)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_student_creation_and_unique_student_code(db_session):
    """Verify Student creation, unique student_code, and user_id unicity."""
    user = User(
        email="student1@school.edu",
        hashed_password="pw_hash_test",
        full_name="Alice Student",
        role="student",
    )
    db_session.add(user)
    db_session.commit()

    student = Student(
        student_code="STU00001",
        user_id=user.id,
        first_name="Alice",
        last_name="Johnson",
        cohort_year=2026,
        school="GP",
    )
    db_session.add(student)
    db_session.commit()

    assert student.id is not None
    assert student.student_code == "STU00001"
    assert student.user.email == "student1@school.edu"

    # Duplicate student_code must raise IntegrityError
    dup_student = Student(
        student_code="STU00001",
        user_id=None,
        first_name="Alice2",
    )
    db_session.add(dup_student)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Two students linked to same user_id must raise IntegrityError
    dup_user_link = Student(
        student_code="STU00002",
        user_id=user.id,
    )
    db_session.add(dup_user_link)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_unlinked_student_creation(db_session):
    """Verify batch CSV enrolled students can exist without an associated User."""
    student = Student(
        student_code="STU00099",
        user_id=None,
        school="MS",
    )
    db_session.add(student)
    db_session.commit()

    assert student.id is not None
    assert student.user_id is None
    assert student.user is None


def test_academic_record_32_features_and_no_g3(db_session):
    """Verify AcademicRecord schema captures exactly 32 features and strictly excludes G3."""
    student = Student(student_code="STU00010")
    db_session.add(student)
    db_session.commit()

    record_data = create_sample_academic_record_dict()
    record = AcademicRecord(student_id=student.id, **record_data)
    db_session.add(record)
    db_session.commit()

    assert record.id is not None
    assert record.student_id == student.id
    assert record.G1 == 12.0
    assert record.G2 == 13.0

    # Test ML feature extraction dictionary
    feature_dict = record.to_ml_feature_dict()
    assert len(feature_dict) == 32
    assert "G1" in feature_dict
    assert "G2" in feature_dict

    # STRICT ANTI-LEAKAGE GUARANTEE CHECKS
    assert "G3" not in feature_dict
    assert "G3" not in AcademicRecord.__table__.columns
    assert "g3" not in AcademicRecord.__table__.columns


def test_prediction_append_only_behavior(db_session):
    """Verify predictions are append-only and preserve historical trajectory."""
    student = Student(student_code="STU00020")
    db_session.add(student)
    db_session.commit()

    pred1 = Prediction(
        student_id=student.id,
        risk_probability=0.82,
        risk_level="High",
        at_risk_binary=1,
        model_version="v1.0.0",
        created_at=datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc),
    )
    db_session.add(pred1)
    db_session.commit()

    # Second prediction recorded at a later date (e.g. after intervention)
    pred2 = Prediction(
        student_id=student.id,
        risk_probability=0.45,
        risk_level="Medium",
        at_risk_binary=0,
        model_version="v1.0.0",
        created_at=datetime(2026, 9, 15, 14, 0, 0, tzinfo=timezone.utc),
    )
    db_session.add(pred2)
    db_session.commit()

    db_session.refresh(student)
    # Both predictions must persist without overwriting
    assert len(student.predictions) == 2
    # Verify ordered by created_at descending (latest first)
    assert student.predictions[0].risk_level == "Medium"
    assert student.predictions[1].risk_level == "High"


def test_explanation_cascade_delete(db_session):
    """Verify Explanation model attributes and cascade delete when Prediction is removed."""
    student = Student(student_code="STU00030")
    db_session.add(student)
    db_session.commit()

    prediction = Prediction(
        student_id=student.id,
        risk_probability=0.78,
        risk_level="High",
        at_risk_binary=1,
    )
    db_session.add(prediction)
    db_session.commit()

    exp1 = Explanation(
        prediction_id=prediction.id,
        feature_name="failures",
        display_name="Past Class Failures",
        contribution=0.42,
        direction="increases_risk",
        raw_value="2",
    )
    exp2 = Explanation(
        prediction_id=prediction.id,
        feature_name="G2",
        display_name="Mid-Term Grade (G2)",
        contribution=-0.35,
        direction="decreases_risk",
        raw_value="14.0",
    )
    db_session.add_all([exp1, exp2])
    db_session.commit()

    db_session.refresh(prediction)
    assert len(prediction.explanations) == 2
    assert prediction.explanations[0].feature_name == "failures"

    # Delete prediction -> verify explanations cascade deleted
    db_session.delete(prediction)
    db_session.commit()

    remaining_exps = db_session.query(Explanation).filter_by(prediction_id=prediction.id).all()
    assert len(remaining_exps) == 0


def test_recommendation_model_and_cascade(db_session):
    """Verify Recommendation fields, default values, and cascade delete."""
    student = Student(student_code="STU00040")
    db_session.add(student)
    db_session.commit()

    prediction = Prediction(
        student_id=student.id,
        risk_probability=0.88,
        risk_level="High",
        at_risk_binary=1,
    )
    db_session.add(prediction)
    db_session.commit()

    rec = Recommendation(
        student_id=student.id,
        prediction_id=prediction.id,
        title="Midterm Grade Coaching",
        description="Schedule review of core algebra concepts before finals.",
        category="Academic",
        priority="high",
        trigger_condition="G2 < 10",
    )
    db_session.add(rec)
    db_session.commit()

    assert rec.id is not None
    assert rec.is_acknowledged is False
    assert rec.category == "Academic"
    assert rec.priority == "high"

    # Verify student relationship
    db_session.refresh(student)
    assert len(student.recommendations) == 1
    assert student.recommendations[0].title == "Midterm Grade Coaching"

    # Delete prediction -> verify recommendation is cascade deleted
    db_session.delete(prediction)
    db_session.commit()

    remaining_recs = db_session.query(Recommendation).filter_by(student_id=student.id).all()
    assert len(remaining_recs) == 0


def test_student_full_cascade_deletion(db_session):
    """Verify deleting a Student cascades to AcademicRecords, Predictions, Explanations, and Recommendations."""
    student = Student(student_code="STU00050")
    db_session.add(student)
    db_session.commit()

    record_data = create_sample_academic_record_dict()
    record = AcademicRecord(student_id=student.id, **record_data)
    db_session.add(record)
    db_session.commit()

    prediction = Prediction(
        student_id=student.id,
        academic_record_id=record.id,
        risk_probability=0.75,
        risk_level="High",
        at_risk_binary=1,
    )
    db_session.add(prediction)
    db_session.commit()

    explanation = Explanation(
        prediction_id=prediction.id,
        feature_name="absences",
        display_name="Absences",
        contribution=0.25,
        direction="increases_risk",
        raw_value="15",
    )
    recommendation = Recommendation(
        student_id=student.id,
        prediction_id=prediction.id,
        title="Attendance Advising",
        description="Check-in to identify commute or health hurdles.",
        category="Attendance",
        priority="high",
    )
    db_session.add_all([explanation, recommendation])
    db_session.commit()

    # Delete the student
    student_id = student.id
    db_session.delete(student)
    db_session.commit()

    # Verify all child rows are deleted
    assert db_session.query(AcademicRecord).filter_by(student_id=student_id).count() == 0
    assert db_session.query(Prediction).filter_by(student_id=student_id).count() == 0
    assert db_session.query(Explanation).filter_by(prediction_id=prediction.id).count() == 0
    assert db_session.query(Recommendation).filter_by(student_id=student_id).count() == 0


def test_user_deletion_sets_student_user_id_null(db_session):
    """Verify deleting a User does not delete the Student profile, but sets user_id to NULL."""
    user = User(
        email="graduating@school.edu",
        hashed_password="pw_hash_test",
        full_name="Bob Graduate",
        role="student",
    )
    db_session.add(user)
    db_session.commit()

    student = Student(
        student_code="STU00060",
        user_id=user.id,
        first_name="Bob",
    )
    db_session.add(student)
    db_session.commit()

    # Delete user
    db_session.delete(user)
    db_session.commit()

    db_session.refresh(student)
    assert student is not None
    assert student.user_id is None
    assert student.user is None
