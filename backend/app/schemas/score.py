# -*- coding: utf-8 -*-
"""Score schemas."""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class ScoreItemCreate(BaseModel):
    """Create score item request"""
    name: str = Field(..., min_length=1, max_length=50)
    target_type: str = Field("student", pattern="^(student|group)$")
    score_type: str = Field(..., pattern="^(plus|minus)$")
    score_value: int = Field(..., gt=0)
    subject: str | None = None
    color_tag: str | None = None
    icon_name: str | None = None
    enabled: bool = True
    sort_order: int = 0


class ScoreItemUpdate(BaseModel):
    """Update score item request"""
    name: str | None = None
    target_type: str | None = Field(None, pattern="^(student|group)$")
    score_type: str | None = Field(None, pattern="^(plus|minus)$")
    score_value: int | None = Field(None, gt=0)
    subject: str | None = None
    color_tag: str | None = None
    icon_name: str | None = None
    enabled: bool | None = None
    sort_order: int | None = None


class ScoreItemResponse(BaseModel):
    """Score item response"""
    id: int
    class_id: int
    name: str
    target_type: str
    score_type: str
    score_value: int
    subject: str | None = None
    color_tag: str | None = None
    icon_name: str | None = None
    enabled: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class StudentScoreRequest(BaseModel):
    """Student score request"""
    score_item_id: int
    subject: str | None = None
    remark: str | None = None


class GroupScoreRequest(BaseModel):
    """Group score request"""
    score_item_id: int
    subject: str | None = None
    remark: str | None = None


class StudentScoreLogResponse(BaseModel):
    """Student score log response"""
    id: int
    class_id: int
    student_id: int
    operator_id: int
    score_item_id: int | None = None
    item_name_snapshot: str
    score_delta: int
    score_type: str
    subject: str | None = None
    remark: str | None = None
    is_revoked: bool
    revoked_by: int | None = None
    revoked_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GroupScoreLogResponse(BaseModel):
    """Group score log response"""
    id: int
    class_id: int
    group_id: int
    operator_id: int
    score_item_id: int | None = None
    item_name_snapshot: str
    score_delta: int
    subject: str | None = None
    remark: str | None = None
    is_revoked: bool
    revoked_by: int | None = None
    revoked_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClassScoreHistoryResponse(BaseModel):
    """Merged class score history response."""
    id: int
    class_id: int
    type: str = Field(..., pattern="^(student|group)$")
    student_id: int | None = None
    student_name: str | None = None
    group_id: int | None = None
    group_name: str | None = None
    item_name_snapshot: str
    score_delta: int
    score_type: str = Field(..., pattern="^(plus|minus)$")
    subject: str | None = None
    remark: str | None = None
    is_revoked: bool
    revoked_by: int | None = None
    revoked_at: datetime | None = None
    created_at: datetime


class StudentClassScoreHistoryResponse(BaseModel):
    """Student-only class score history response."""
    id: int
    class_id: int
    student_id: int
    student_name: str
    score_item_id: int | None = None
    item_name_snapshot: str
    score_delta: int
    score_type: str = Field(..., pattern="^(plus|minus)$")
    subject: str | None = None
    remark: str | None = None
    is_revoked: bool
    revoked_by: int | None = None
    revoked_at: datetime | None = None
    created_at: datetime


class GroupClassScoreHistoryResponse(BaseModel):
    """Group-only class score history response."""
    id: int
    class_id: int
    group_id: int
    group_name: str
    score_item_id: int | None = None
    item_name_snapshot: str
    score_delta: int
    score_type: str = Field(..., pattern="^(plus|minus)$")
    subject: str | None = None
    remark: str | None = None
    is_revoked: bool
    revoked_by: int | None = None
    revoked_at: datetime | None = None
    created_at: datetime
