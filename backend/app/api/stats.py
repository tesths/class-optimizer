# -*- coding: utf-8 -*-
"""Statistics API routes."""
from typing import List
from datetime import UTC, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import ClassTeacher
from app.models.student import Student
from app.models.group import StudentGroup
from app.models.score import StudentScoreLog, GroupScoreLog
from app.schemas.stats import StatsOverview, StudentStats, GroupStats, SubjectStats

router = APIRouter(prefix="/classes/{class_id}/stats", tags=["统计"])


def check_class_access(db: Session, class_id: int, user_id: int) -> bool:
    """Check if user has access to class"""
    return db.query(ClassTeacher).filter(
        ClassTeacher.class_id == class_id,
        ClassTeacher.user_id == user_id
    ).first() is not None


def get_week_start() -> datetime:
    """Get start of current week"""
    today = datetime.now(UTC).date()
    return datetime.combine(
        today - timedelta(days=today.weekday()),
        datetime.min.time(),
        tzinfo=UTC,
    )


def get_month_start() -> datetime:
    """Get start of current month"""
    today = datetime.now(UTC).date()
    return datetime.combine(today.replace(day=1), datetime.min.time(), tzinfo=UTC)


def get_semester_start() -> datetime:
    """Get start of current semester (approximately 5 months ago)"""
    today = datetime.now(UTC).date()
    # Assume semester is ~5 months, find the 1st of the month 5 months ago
    month = today.month - 5
    year = today.year
    if month <= 0:
        month += 12
        year -= 1
    return datetime.combine(today.replace(month=month, day=1), datetime.min.time(), tzinfo=UTC)


@router.get("/overview", response_model=StatsOverview)
async def get_stats_overview(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get class stats overview"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    week_start = get_week_start()
    month_start = get_month_start()

    student_count = db.query(Student).filter(Student.class_id == class_id).count()
    group_count = db.query(StudentGroup).filter(StudentGroup.class_id == class_id).count()

    week_plus = db.query(func.coalesce(func.sum(StudentScoreLog.score_delta), 0)).filter(
        StudentScoreLog.class_id == class_id,
        StudentScoreLog.is_revoked == False,
        StudentScoreLog.score_delta > 0,
        StudentScoreLog.created_at >= week_start
    ).scalar()

    week_minus = db.query(func.coalesce(func.sum(StudentScoreLog.score_delta), 0)).filter(
        StudentScoreLog.class_id == class_id,
        StudentScoreLog.is_revoked == False,
        StudentScoreLog.score_delta < 0,
        StudentScoreLog.created_at >= week_start
    ).scalar()

    month_plus = db.query(func.coalesce(func.sum(StudentScoreLog.score_delta), 0)).filter(
        StudentScoreLog.class_id == class_id,
        StudentScoreLog.is_revoked == False,
        StudentScoreLog.score_delta > 0,
        StudentScoreLog.created_at >= month_start
    ).scalar()

    month_minus = db.query(func.coalesce(func.sum(StudentScoreLog.score_delta), 0)).filter(
        StudentScoreLog.class_id == class_id,
        StudentScoreLog.is_revoked == False,
        StudentScoreLog.score_delta < 0,
        StudentScoreLog.created_at >= month_start
    ).scalar()

    # Add group scores to overview
    group_week_plus = db.query(func.coalesce(func.sum(GroupScoreLog.score_delta), 0)).filter(
        GroupScoreLog.class_id == class_id,
        GroupScoreLog.is_revoked == False,
        GroupScoreLog.score_delta > 0,
        GroupScoreLog.created_at >= week_start
    ).scalar() or 0

    group_week_minus = db.query(func.coalesce(func.sum(GroupScoreLog.score_delta), 0)).filter(
        GroupScoreLog.class_id == class_id,
        GroupScoreLog.is_revoked == False,
        GroupScoreLog.score_delta < 0,
        GroupScoreLog.created_at >= week_start
    ).scalar() or 0

    group_month_plus = db.query(func.coalesce(func.sum(GroupScoreLog.score_delta), 0)).filter(
        GroupScoreLog.class_id == class_id,
        GroupScoreLog.is_revoked == False,
        GroupScoreLog.score_delta > 0,
        GroupScoreLog.created_at >= month_start
    ).scalar() or 0

    group_month_minus = db.query(func.coalesce(func.sum(GroupScoreLog.score_delta), 0)).filter(
        GroupScoreLog.class_id == class_id,
        GroupScoreLog.is_revoked == False,
        GroupScoreLog.score_delta < 0,
        GroupScoreLog.created_at >= month_start
    ).scalar() or 0

    return StatsOverview(
        student_count=student_count,
        group_count=group_count,
        week_plus=(week_plus or 0) + group_week_plus,
        week_minus=abs((week_minus or 0) + group_week_minus),
        month_plus=(month_plus or 0) + group_month_plus,
        month_minus=abs((month_minus or 0) + group_month_minus)
    )


@router.get("/students", response_model=List[StudentStats])
async def get_student_stats(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get student ranking stats"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    week_start = get_week_start()
    month_start = get_month_start()
    semester_start = get_semester_start()

    students = db.query(Student).filter(Student.class_id == class_id).all()
    result = []

    for s in students:
        total = db.query(func.coalesce(func.sum(StudentScoreLog.score_delta), 0)).filter(
            StudentScoreLog.student_id == s.id,
            StudentScoreLog.is_revoked == False
        ).scalar()

        week_score = db.query(func.coalesce(func.sum(StudentScoreLog.score_delta), 0)).filter(
            StudentScoreLog.student_id == s.id,
            StudentScoreLog.is_revoked == False,
            StudentScoreLog.created_at >= week_start
        ).scalar()

        month_score = db.query(func.coalesce(func.sum(StudentScoreLog.score_delta), 0)).filter(
            StudentScoreLog.student_id == s.id,
            StudentScoreLog.is_revoked == False,
            StudentScoreLog.created_at >= month_start
        ).scalar()

        semester_score = db.query(func.coalesce(func.sum(StudentScoreLog.score_delta), 0)).filter(
            StudentScoreLog.student_id == s.id,
            StudentScoreLog.is_revoked == False,
            StudentScoreLog.created_at >= semester_start
        ).scalar()

        plus_count = db.query(StudentScoreLog).filter(
            StudentScoreLog.student_id == s.id,
            StudentScoreLog.is_revoked == False,
            StudentScoreLog.score_delta > 0
        ).count()

        minus_count = db.query(StudentScoreLog).filter(
            StudentScoreLog.student_id == s.id,
            StudentScoreLog.is_revoked == False,
            StudentScoreLog.score_delta < 0
        ).count()

        result.append(StudentStats(
            student_id=s.id,
            name=s.name,
            total_score=total or 0,
            week_score=week_score or 0,
            month_score=month_score or 0,
            semester_score=semester_score or 0,
            plus_count=plus_count,
            minus_count=minus_count
        ))

    result.sort(key=lambda x: x.total_score, reverse=True)
    return result


@router.get("/groups", response_model=List[GroupStats])
async def get_group_stats(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get group ranking stats"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    week_start = get_week_start()
    month_start = get_month_start()
    semester_start = get_semester_start()

    groups = db.query(StudentGroup).filter(StudentGroup.class_id == class_id).all()
    result = []

    for g in groups:
        total = db.query(func.coalesce(func.sum(GroupScoreLog.score_delta), 0)).filter(
            GroupScoreLog.group_id == g.id,
            GroupScoreLog.is_revoked == False
        ).scalar()

        week_score = db.query(func.coalesce(func.sum(GroupScoreLog.score_delta), 0)).filter(
            GroupScoreLog.group_id == g.id,
            GroupScoreLog.is_revoked == False,
            GroupScoreLog.created_at >= week_start
        ).scalar()

        month_score = db.query(func.coalesce(func.sum(GroupScoreLog.score_delta), 0)).filter(
            GroupScoreLog.group_id == g.id,
            GroupScoreLog.is_revoked == False,
            GroupScoreLog.created_at >= month_start
        ).scalar()

        semester_score = db.query(func.coalesce(func.sum(GroupScoreLog.score_delta), 0)).filter(
            GroupScoreLog.group_id == g.id,
            GroupScoreLog.is_revoked == False,
            GroupScoreLog.created_at >= semester_start
        ).scalar()

        result.append(GroupStats(
            group_id=g.id,
            name=g.name,
            total_score=total or 0,
            week_score=week_score or 0,
            month_score=month_score or 0,
            semester_score=semester_score or 0
        ))

    result.sort(key=lambda x: x.total_score, reverse=True)
    return result


@router.get("/subjects", response_model=List[SubjectStats])
async def get_subject_stats(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get subject-wise stats"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    logs = db.query(StudentScoreLog).filter(
        StudentScoreLog.class_id == class_id,
        StudentScoreLog.is_revoked == False,
        StudentScoreLog.subject != None
    ).all()

    subject_data = {}
    for log in logs:
        subj = log.subject or "其他"
        if subj not in subject_data:
            subject_data[subj] = {"plus_count": 0, "minus_count": 0, "total_delta": 0}
        if log.score_delta > 0:
            subject_data[subj]["plus_count"] += 1
        else:
            subject_data[subj]["minus_count"] += 1
        subject_data[subj]["total_delta"] += log.score_delta

    result = [
        SubjectStats(subject=k, **v)
        for k, v in subject_data.items()
    ]
    result.sort(key=lambda x: x.total_delta)
    return result
