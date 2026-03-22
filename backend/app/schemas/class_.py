# -*- coding: utf-8 -*-
"""Class schemas."""
from pydantic import BaseModel, ConfigDict, Field
from pydantic import field_validator
from datetime import datetime
from app.utils.growth import DEFAULT_GROUP_GROWTH_THRESHOLDS, validate_growth_thresholds


class ClassCreate(BaseModel):
    """Create class request"""
    name: str = Field(..., min_length=1, max_length=50)
    grade: str | None = None
    school_year: str = Field(..., min_length=1, max_length=10)
    term_id: int | None = None
    description: str | None = None
    visual_theme: str = Field(default="farm", pattern="^(farm|tree)$")
    group_growth_thresholds: list[int] = Field(default_factory=lambda: DEFAULT_GROUP_GROWTH_THRESHOLDS.copy())

    @field_validator("group_growth_thresholds")
    @classmethod
    def validate_group_growth_thresholds(cls, value: list[int]) -> list[int]:
        return validate_growth_thresholds(value)


class ClassUpdate(BaseModel):
    """Update class request"""
    name: str | None = None
    grade: str | None = None
    school_year: str | None = None
    term_id: int | None = None
    description: str | None = None
    visual_theme: str | None = Field(None, pattern="^(farm|tree)$")
    group_growth_thresholds: list[int] | None = None

    @field_validator("group_growth_thresholds")
    @classmethod
    def validate_group_growth_thresholds(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return None
        return validate_growth_thresholds(value)


class ClassResponse(BaseModel):
    """Class response"""
    id: int
    name: str
    grade: str | None = None
    school_year: str | None = None
    term_id: int | None = None
    description: str | None = None
    visual_theme: str
    group_growth_thresholds: list[int]
    creator_id: int
    created_at: datetime
    updated_at: datetime
    student_count: int = 0
    teacher_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class TeacherAddRequest(BaseModel):
    """Add teacher request"""
    username: str
    role: str = Field(default="class_teacher", pattern="^(class_admin|class_teacher)$")


class ClassTeacherResponse(BaseModel):
    """Class teacher response"""
    id: int
    class_id: int
    user_id: int
    role: str
    user: dict | None = None

    model_config = ConfigDict(from_attributes=True)
