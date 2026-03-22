# -*- coding: utf-8 -*-
"""Student schemas."""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class StudentCreate(BaseModel):
    """Create student request"""
    name: str = Field(..., min_length=1, max_length=50)
    student_no: str = Field(..., min_length=1, max_length=50)
    gender: str | None = None
    seat_no: str | None = None
    notes: str | None = None
    group_id: int | None = None


class StudentUpdate(BaseModel):
    """Update student request"""
    name: str | None = None
    student_no: str | None = None
    gender: str | None = None
    seat_no: str | None = None
    notes: str | None = None
    group_id: int | None = None


class StudentResponse(BaseModel):
    """Student response"""
    id: int
    class_id: int
    name: str
    student_no: str
    gender: str | None = None
    seat_no: str | None = None
    avatar_url: str | None = None
    notes: str | None = None
    group_id: int | None = None
    group_name: str | None = None
    total_score: int = 0
    growth_stage: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
