# -*- coding: utf-8 -*-
"""Scoring API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.group import StudentGroup
from app.models.score import StudentScoreLog, GroupScoreLog
from app.schemas.score import (
    ClassScoreHistoryResponse,
    GroupClassScoreHistoryResponse,
    StudentScoreRequest, StudentScoreLogResponse,
    GroupScoreRequest, GroupScoreLogResponse,
    StudentClassScoreHistoryResponse,
)
from app.utils.auth import check_class_access
from app.services.scoring_service import (
    create_student_score_log,
    get_group_class_score_history,
    get_class_score_history,
    get_student_class_score_history,
    revoke_student_score_log,
    create_group_score_log,
    revoke_group_score_log,
)

router = APIRouter(tags=["评分"])


@router.get("/classes/{class_id}/score-history", response_model=List[ClassScoreHistoryResponse])
async def get_class_history(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get merged student and group score history for a class."""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")
    return get_class_score_history(db, class_id)


@router.get("/classes/{class_id}/student-score-history", response_model=List[StudentClassScoreHistoryResponse])
async def get_class_student_history(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get student-only score history for a class."""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")
    return get_student_class_score_history(db, class_id)


@router.get("/classes/{class_id}/group-score-history", response_model=List[GroupClassScoreHistoryResponse])
async def get_class_group_history(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get group-only score history for a class."""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")
    return get_group_class_score_history(db, class_id)


@router.post("/students/{student_id}/score", response_model=StudentScoreLogResponse, status_code=status.HTTP_201_CREATED)
async def score_student(
    student_id: int,
    data: StudentScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Score a student"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")

    if not check_class_access(db, student.class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    return create_student_score_log(
        db=db,
        class_id=student.class_id,
        student_id=student_id,
        operator_id=current_user.id,
        score_item_id=data.score_item_id,
        subject=data.subject,
        remark=data.remark
    )


@router.get("/students/{student_id}/score-logs", response_model=List[StudentScoreLogResponse])
async def get_student_score_logs(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get student score logs"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")

    if not check_class_access(db, student.class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    return db.query(StudentScoreLog).filter(
        StudentScoreLog.student_id == student_id
    ).order_by(StudentScoreLog.created_at.desc()).all()


@router.post("/student-score-logs/{log_id}/revoke")
async def revoke_student_score(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke a student score log (admin only)"""
    return revoke_student_score_log(db, log_id, current_user.id)


@router.post("/groups/{group_id}/score", response_model=GroupScoreLogResponse, status_code=status.HTTP_201_CREATED)
async def score_group(
    group_id: int,
    data: GroupScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Score a group"""
    group = db.query(StudentGroup).filter(StudentGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="小组不存在")

    if not check_class_access(db, group.class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    return create_group_score_log(
        db=db,
        class_id=group.class_id,
        group_id=group_id,
        operator_id=current_user.id,
        score_item_id=data.score_item_id,
        subject=data.subject,
        remark=data.remark
    )


@router.get("/groups/{group_id}/score-logs", response_model=List[GroupScoreLogResponse])
async def get_group_score_logs(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get group score logs"""
    group = db.query(StudentGroup).filter(StudentGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="小组不存在")

    if not check_class_access(db, group.class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    return db.query(GroupScoreLog).filter(
        GroupScoreLog.group_id == group_id
    ).order_by(GroupScoreLog.created_at.desc()).all()


@router.post("/group-score-logs/{log_id}/revoke")
async def revoke_group_score(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke a group score log (admin only)"""
    return revoke_group_score_log(db, log_id, current_user.id)
