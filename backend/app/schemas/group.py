# -*- coding: utf-8 -*-
"""Group schemas."""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class GroupCreate(BaseModel):
    """Create group request"""
    name: str = Field(..., min_length=1, max_length=50)
    leader_student_id: int | None = None


class GroupUpdate(BaseModel):
    """Update group request"""
    name: str | None = None
    leader_student_id: int | None = None


class GroupResponse(BaseModel):
    """Group response"""
    id: int
    class_id: int
    name: str
    leader_student_id: int | None = None
    total_score: int = 0
    member_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GroupMemberAdd(BaseModel):
    """Add member request"""
    student_id: int


class GroupMemberResponse(BaseModel):
    """Group member response"""
    id: int
    group_id: int
    student_id: int
    student: dict | None = None

    model_config = ConfigDict(from_attributes=True)
