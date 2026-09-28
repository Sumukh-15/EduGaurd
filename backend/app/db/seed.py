"""Database seeding utility for test and local development environments.

Idempotently creates standard test accounts:
  - student@school.edu (student role, linked to student profile STU-1001)
  - faculty@school.edu (faculty role)
  - admin@school.edu (admin role)
Also creates an unlinked student profile (STU-1002) for ownership authorization testing.
"""

import sys
import logging
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.security import get_password_hash
from backend.app.db.session import SessionLocal
from backend.app.models.user import User
from backend.app.models.student import Student

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eduguard.seed")


def seed_test_data(db: Session) -> dict:
    """Idempotently seed test users and student profiles into the database."""
    seeded_users = {}

    # Standard test account configurations
    test_accounts = [
        {
            "email": "student@school.edu",
            "full_name": "Test Student",
            "role": "student",
            "password": "TestStudent123!",
            "student_code": "STU-1001",
            "first_name": "Test",
            "last_name": "Student",
            "cohort_year": 2026,
            "school": "GP",
        },
        {
            "email": "faculty@school.edu",
            "full_name": "Test Faculty",
            "role": "faculty",
            "password": "TestFaculty123!",
            "student_code": None,
        },
        {
            "email": "admin@school.edu",
            "full_name": "Test Admin",
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
            logger.info("User already exists: %s", user.email)

        # Link student profile if applicable
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
            elif student.user_id != user.id:
                student.user_id = user.id
                db.flush()

        seeded_users[acc["role"]] = user.email

    # Additional student profile for ownership tests (STU-1002 - unlinked to student@school.edu)
    unlinked_student = db.query(Student).filter(Student.student_code == "STU-1002").first()
    if not unlinked_student:
        unlinked_student = Student(
            student_code="STU-1002",
            user_id=None,
            first_name="Bob",
            last_name="Smith",
            cohort_year=2026,
            school="MS",
        )
        db.add(unlinked_student)
        db.flush()
        logger.info("Created unlinked student profile: STU-1002")

    db.commit()
    logger.info("Database seeding completed successfully.")
    return seeded_users


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_test_data(db)
    finally:
        db.close()
