"""Admin endpoints for system configuration and mentor-student assignments."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, require_roles
from backend.app.models.assignment import MentorAssignment
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.assignment import (
    AssignmentCreateRequest,
    AssignmentItem,
    AssignmentListResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/assignments",
    response_model=AssignmentListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign students to a faculty mentor",
    dependencies=[Depends(require_roles("admin"))],
)
def create_assignments(
    payload: AssignmentCreateRequest,
    db: Session = Depends(get_db),
) -> AssignmentListResponse:
    """Assign multiple students to a faculty mentor (Admin only)."""
    faculty = db.query(User).filter(User.id == payload.faculty_user_id).first()
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Faculty user with ID {payload.faculty_user_id} not found.",
        )
    if faculty.role not in ("faculty", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with ID {payload.faculty_user_id} is not a faculty member or administrator.",
        )

    students = db.query(Student).filter(Student.id.in_(payload.student_ids)).all()
    existing_student_ids = {s.id for s in students}
    missing_ids = set(payload.student_ids) - existing_student_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student ID(s) not found: {sorted(list(missing_ids))}",
        )

    student_code_map = {s.id: s.student_code for s in students}
    created_items = []

    for sid in payload.student_ids:
        assignment = (
            db.query(MentorAssignment)
            .filter(
                MentorAssignment.faculty_user_id == payload.faculty_user_id,
                MentorAssignment.student_id == sid,
            )
            .first()
        )
        if not assignment:
            assignment = MentorAssignment(
                faculty_user_id=payload.faculty_user_id,
                student_id=sid,
            )
            db.add(assignment)
            db.flush()

        created_items.append(
            AssignmentItem(
                id=assignment.id,
                faculty_user_id=assignment.faculty_user_id,
                student_id=assignment.student_id,
                student_code=student_code_map.get(assignment.student_id),
                created_at=assignment.created_at,
            )
        )

    db.commit()
    return AssignmentListResponse(total=len(created_items), items=created_items)


@router.delete(
    "/assignments/{id}",
    summary="Delete a mentor assignment",
    dependencies=[Depends(require_roles("admin"))],
)
def delete_assignment(
    id: int,
    db: Session = Depends(get_db),
):
    """Delete a mentor assignment by its ID (Admin only)."""
    assignment = db.query(MentorAssignment).filter(MentorAssignment.id == id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with ID {id} not found.",
        )

    db.delete(assignment)
    db.commit()
    return {"message": f"Assignment {id} deleted successfully."}


@router.get(
    "/assignments",
    response_model=AssignmentListResponse,
    summary="List mentor assignments",
    dependencies=[Depends(require_roles("admin"))],
)
def list_assignments(
    faculty_user_id: Optional[int] = Query(None, description="Filter assignments by faculty user ID"),
    db: Session = Depends(get_db),
) -> AssignmentListResponse:
    """List mentor assignments, optionally filtered by faculty member (Admin only)."""
    query = (
        db.query(MentorAssignment, Student.student_code)
        .outerjoin(Student, MentorAssignment.student_id == Student.id)
    )

    if faculty_user_id is not None:
        query = query.filter(MentorAssignment.faculty_user_id == faculty_user_id)

    results = query.order_by(MentorAssignment.created_at.desc()).all()

    items = [
        AssignmentItem(
            id=assignment.id,
            faculty_user_id=assignment.faculty_user_id,
            student_id=assignment.student_id,
            student_code=student_code,
            created_at=assignment.created_at,
        )
        for assignment, student_code in results
    ]

    return AssignmentListResponse(total=len(items), items=items)
