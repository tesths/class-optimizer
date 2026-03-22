# -*- coding: utf-8 -*-
"""Import job schemas."""
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ImportJobResponse(BaseModel):
    """Import job response"""
    id: int
    class_id: int
    operator_id: int
    file_name: str
    total_rows: int
    success_rows: int
    failed_rows: int
    error_report: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImportPreviewItem(BaseModel):
    """Preview item for import"""
    row: int
    name: str
    student_no: str
    gender: str | None = None
    seat_no: str | None = None
    group_name: str | None = None
    notes: str | None = None
    status: str  # ok, error
    error: str | None = None


class ImportPreviewResponse(BaseModel):
    """Import preview response"""
    total: int
    valid_count: int
    error_count: int
    items: list[ImportPreviewItem]
