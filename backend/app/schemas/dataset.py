"""Pydantic schemas for batch dataset uploads and ingestion results."""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DatasetUploadResponse(BaseModel):
    """Structured response returned upon successful batch CSV ingestion."""

    filename: str = Field(..., description="Original filename of the ingested CSV file")
    total_rows: int = Field(..., description="Total data rows parsed and validated from the file")
    records_created: int = Field(..., description="Number of academic records persisted")
    students_created: int = Field(..., description="Number of new student entities provisioned")
    message: str = Field(..., description="Human-readable processing summary")
    status: str = Field("success", description="Overall ingestion status ('success')")

    model_config = ConfigDict(from_attributes=True)
