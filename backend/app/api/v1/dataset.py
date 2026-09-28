"""Dataset batch upload and ingestion endpoints."""

import csv
import io
import os
from typing import Any, Dict, List, Set
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from backend.app.api.deps import require_roles
from backend.app.db.session import get_db
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.academic_data import AcademicRecordCreate
from backend.app.schemas.dataset import DatasetUploadResponse

router = APIRouter(prefix="/dataset", tags=["Dataset"])

# Configuration bounds
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
CHUNK_SIZE_BYTES = 64 * 1024  # 64 KB

ALLOWED_CONTENT_TYPES = {
    "text/csv",
    "text/plain",
    "application/csv",
    "application/x-csv",
    "text/x-csv",
    "application/vnd.ms-excel",
    "application/octet-stream",
}

# The 32 required Phase 1 ML feature names
PERMISSIBLE_FEATURES: Set[str] = {
    "school", "sex", "age", "address", "famsize", "Pstatus", "Medu", "Fedu",
    "Mjob", "Fjob", "reason", "guardian", "traveltime", "studytime", "failures",
    "schoolsup", "famsup", "paid", "activities", "nursery", "higher", "internet",
    "romantic", "famrel", "freetime", "goout", "Dalc", "Walc", "health",
    "absences", "G1", "G2"
}

# Permissible metadata column headers
OPTIONAL_METADATA_COLUMNS: Set[str] = {"student_code", "term"}
ALLOWED_COLUMNS: Set[str] = PERMISSIBLE_FEATURES | OPTIONAL_METADATA_COLUMNS


@router.post(
    "/upload",
    response_model=DatasetUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload & Validate Batch Student Telemetry CSV",
    description="Upload a CSV containing student academic telemetry for batch ingestion. Restricted to faculty and administrators. Target label G3 is strictly forbidden.",
)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("faculty", "admin")),
) -> DatasetUploadResponse:
    """Stream, validate, and persist student academic telemetry records in an atomic transaction."""
    # 1. Filename and Path Traversal Safeguards
    raw_filename = file.filename or "upload.csv"
    safe_filename = os.path.basename(raw_filename.replace("\\", "/"))

    if not safe_filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only .csv files are supported.",
        )

    # 2. Content-Type Check
    if file.content_type and file.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type '{file.content_type}'. Upload must be a valid CSV file.",
        )

    # 3. Streamed Chunk Reading with 10MB Enforcement
    total_size = 0
    content_chunks: List[bytes] = []

    while True:
        chunk = await file.read(CHUNK_SIZE_BYTES)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"File size exceeds maximum permitted limit of 10 MB ({MAX_FILE_SIZE_BYTES} bytes).",
            )
        content_chunks.append(chunk)

    if total_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CSV file is empty.",
        )

    file_bytes = b"".join(content_chunks)

    # 4. Text Decoding
    text_content = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text_content = file_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if text_content is None or not text_content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed file encoding or empty content. CSV must be valid text.",
        )

    # 5. Delimiter Sniffing and CSV Parsing
    first_line = text_content.strip().splitlines()[0]
    delimiter = ";" if ";" in first_line and first_line.count(";") >= first_line.count(",") else ","

    try:
        reader = list(csv.reader(io.StringIO(text_content), delimiter=delimiter))
    except csv.Error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed CSV syntax: unable to parse data rows.",
        )

    if not reader or len(reader) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CSV contains no headers or data.",
        )

    # 6. Header Validation & Anti-Leakage Protection
    raw_headers = [h.strip() for h in reader[0]]
    if not any(raw_headers):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV header line is empty.",
        )

    # STRICT ANTI-LEAKAGE CHECK: Reject target label G3
    normalized_headers = [h.upper() for h in raw_headers]
    if "G3" in normalized_headers:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Data leakage detected: Target label 'G3' is strictly forbidden in uploaded telemetry datasets.",
        )

    header_set = set(raw_headers)

    # Unknown columns check
    unknown_cols = header_set - ALLOWED_COLUMNS
    if unknown_cols:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Unexpected column(s) detected: {sorted(list(unknown_cols))}. Uploaded CSV must strictly match the academic data schema.",
        )

    # Missing required features check
    missing_features = PERMISSIBLE_FEATURES - header_set
    if missing_features:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Missing required feature column(s): {sorted(list(missing_features))}.",
        )

    data_rows = reader[1:]
    if not data_rows or all(len(r) == 0 for r in data_rows):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CSV contains headers but no data rows.",
        )

    # 7. Row-by-Row Schema and Bound Validation (pre-validation pass)
    validated_rows: List[Dict[str, Any]] = []
    seen_file_keys: Set[tuple] = set()

    for idx, row in enumerate(data_rows, start=2):
        # Skip purely blank lines
        if not row or (len(row) == 1 and row[0].strip() == ""):
            continue

        if len(row) != len(raw_headers):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Row {idx}: Column count mismatch (expected {len(raw_headers)}, found {len(row)}).",
            )

        row_dict = {h: val.strip() for h, val in zip(raw_headers, row)}

        # Check for empty values in required features
        for feat in PERMISSIBLE_FEATURES:
            if feat not in row_dict or row_dict[feat] == "":
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Row {idx}: Missing value for required field '{feat}'.",
                )

        # Validate types and bounds using AcademicRecordCreate
        try:
            parsed_payload = {
                "age": int(row_dict["age"]),
                "Medu": int(row_dict["Medu"]),
                "Fedu": int(row_dict["Fedu"]),
                "traveltime": int(row_dict["traveltime"]),
                "studytime": int(row_dict["studytime"]),
                "failures": int(row_dict["failures"]),
                "famrel": int(row_dict["famrel"]),
                "freetime": int(row_dict["freetime"]),
                "goout": int(row_dict["goout"]),
                "Dalc": int(row_dict["Dalc"]),
                "Walc": int(row_dict["Walc"]),
                "health": int(row_dict["health"]),
                "absences": int(row_dict["absences"]),
                "G1": float(row_dict["G1"]),
                "G2": float(row_dict["G2"]),
                "school": row_dict["school"],
                "sex": row_dict["sex"],
                "address": row_dict["address"],
                "famsize": row_dict["famsize"],
                "Pstatus": row_dict["Pstatus"],
                "Mjob": row_dict["Mjob"],
                "Fjob": row_dict["Fjob"],
                "reason": row_dict["reason"],
                "guardian": row_dict["guardian"],
                "schoolsup": row_dict["schoolsup"],
                "famsup": row_dict["famsup"],
                "paid": row_dict["paid"],
                "activities": row_dict["activities"],
                "nursery": row_dict["nursery"],
                "higher": row_dict["higher"],
                "internet": row_dict["internet"],
                "romantic": row_dict["romantic"],
                "term": row_dict.get("term", "Term 1") or "Term 1",
            }
            record_schema = AcademicRecordCreate(**parsed_payload)
        except (ValueError, TypeError) as num_err:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Row {idx}: Numeric format error: {str(num_err)}",
            )
        except ValidationError as pydantic_err:
            first_err = pydantic_err.errors()[0]
            field_name = first_err.get("loc", ["field"])[0]
            err_msg = first_err.get("msg", "Invalid value")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Row {idx}: Invalid value for '{field_name}': {err_msg}",
            )

        student_code = row_dict.get("student_code", "").strip() or None
        term_val = parsed_payload["term"]

        # Duplicate row check within this upload batch
        if student_code:
            key = (student_code, term_val)
            if key in seen_file_keys:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Row {idx}: Duplicate record detected for student '{student_code}' in term '{term_val}' within the uploaded file.",
                )
            seen_file_keys.add(key)

        validated_rows.append({
            "student_code": student_code,
            "school": parsed_payload["school"],
            "record": record_schema,
        })

    if not validated_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid data rows found in uploaded file.",
        )

    # 8. Atomic Database Persistence
    records_created = 0
    students_created = 0

    try:
        for item in validated_rows:
            code = item["student_code"]
            if code:
                student = db.query(Student).filter(Student.student_code == code).first()
                if not student:
                    student = Student(
                        student_code=code,
                        school=item["school"],
                        cohort_year=2026,
                    )
                    db.add(student)
                    db.flush()
                    students_created += 1
            else:
                # Auto-generate deterministic student code
                current_count = db.query(Student).count() + 1
                auto_code = f"STU-AUTO-{current_count:05d}"
                student = Student(
                    student_code=auto_code,
                    school=item["school"],
                    cohort_year=2026,
                )
                db.add(student)
                db.flush()
                students_created += 1

            record_dict = item["record"].model_dump()
            new_record = AcademicRecord(
                student_id=student.id,
                **record_dict,
            )
            db.add(new_record)
            records_created += 1

        db.commit()
    except Exception as db_err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist uploaded dataset due to a database transaction error.",
        )

    return DatasetUploadResponse(
        filename=safe_filename,
        total_rows=len(validated_rows),
        records_created=records_created,
        students_created=students_created,
        message=f"Successfully ingested {records_created} academic records across {records_created} rows ({students_created} new student profiles created).",
        status="success",
    )
