# -*- coding: utf-8 -*-
"""Stats schemas."""
from pydantic import BaseModel


class StatsOverview(BaseModel):
    """Class stats overview"""
    student_count: int = 0
    group_count: int = 0
    week_plus: int = 0
    week_minus: int = 0
    month_plus: int = 0
    month_minus: int = 0


class StudentStats(BaseModel):
    """Student statistics"""
    student_id: int
    name: str
    total_score: int = 0
    week_score: int = 0
    month_score: int = 0
    semester_score: int = 0
    plus_count: int = 0
    minus_count: int = 0


class GroupStats(BaseModel):
    """Group statistics"""
    group_id: int
    name: str
    total_score: int = 0
    week_score: int = 0
    month_score: int = 0
    semester_score: int = 0


class SubjectStats(BaseModel):
    """Subject statistics"""
    subject: str
    plus_count: int = 0
    minus_count: int = 0
    total_delta: int = 0
