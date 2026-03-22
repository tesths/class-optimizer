# -*- coding: utf-8 -*-
"""Scoring-related business logic services."""
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.score import StudentScoreLog, GroupScoreLog, ScoreItem
from app.models.group import StudentGroup
from app.models.student import Student
from app.utils.auth import check_class_admin


def _score_delta_from_item(score_item: ScoreItem) -> int:
    """Resolve the persisted delta from a score item definition."""
    return score_item.score_value if score_item.score_type == "plus" else -score_item.score_value


def _resolve_score_item(
    db: Session,
    class_id: int,
    score_item_id: int,
    target_type: str,
) -> ScoreItem:
    """Validate and return a score item for the given class and target."""
    score_item = db.query(ScoreItem).filter(
        ScoreItem.id == score_item_id,
        ScoreItem.class_id == class_id,
    ).first()
    if not score_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="积分项目不存在或不属于该班级",
        )
    if not score_item.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该积分项目已禁用",
        )
    if score_item.target_type != target_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="积分项目与评分对象类型不匹配",
        )
    return score_item


def create_student_score_log(
    db: Session,
    class_id: int,
    student_id: int,
    operator_id: int,
    score_item_id: int,
    subject: str | None = None,
    remark: str | None = None
) -> StudentScoreLog:
    """Create a student score log entry."""
    score_item = _resolve_score_item(db, class_id, score_item_id, "student")
    score_delta = _score_delta_from_item(score_item)

    log = StudentScoreLog(
        class_id=class_id,
        student_id=student_id,
        operator_id=operator_id,
        score_item_id=score_item_id,
        item_name_snapshot=score_item.name,
        score_delta=score_delta,
        score_type=score_item.score_type,
        subject=subject or score_item.subject,
        remark=remark,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def revoke_student_score_log(db: Session, log_id: int, user_id: int) -> dict:
    """Revoke a student score log. Requires class admin."""
    log = db.query(StudentScoreLog).filter(StudentScoreLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="记录不存在")

    if not check_class_admin(db, log.class_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要班级管理员权限")

    if log.is_revoked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该记录已被撤销")

    log.is_revoked = True
    log.revoked_by = user_id
    log.revoked_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "撤销成功"}


def create_group_score_log(
    db: Session,
    class_id: int,
    group_id: int,
    operator_id: int,
    score_item_id: int,
    subject: str | None = None,
    remark: str | None = None
) -> GroupScoreLog:
    """Create a group score log entry."""
    score_item = _resolve_score_item(db, class_id, score_item_id, "group")
    log = GroupScoreLog(
        class_id=class_id,
        group_id=group_id,
        operator_id=operator_id,
        score_item_id=score_item_id,
        item_name_snapshot=score_item.name,
        score_delta=_score_delta_from_item(score_item),
        subject=subject or score_item.subject,
        remark=remark,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def revoke_group_score_log(db: Session, log_id: int, user_id: int) -> dict:
    """Revoke a group score log. Requires class admin."""
    log = db.query(GroupScoreLog).filter(GroupScoreLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="记录不存在")

    if not check_class_admin(db, log.class_id, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要班级管理员权限")

    if log.is_revoked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该记录已被撤销")

    log.is_revoked = True
    log.revoked_by = user_id
    log.revoked_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "撤销成功"}


def get_student_class_score_history(db: Session, class_id: int) -> list[dict]:
    """Return student-only score history for a class."""
    student_logs = db.query(StudentScoreLog, Student.name).join(
        Student,
        Student.id == StudentScoreLog.student_id,
    ).filter(StudentScoreLog.class_id == class_id).all()

    history = [
        {
            "id": log.id,
            "class_id": log.class_id,
            "student_id": log.student_id,
            "student_name": student_name,
            "score_item_id": log.score_item_id,
            "item_name_snapshot": log.item_name_snapshot,
            "score_delta": log.score_delta,
            "score_type": log.score_type,
            "subject": log.subject,
            "remark": log.remark,
            "is_revoked": log.is_revoked,
            "revoked_by": log.revoked_by,
            "revoked_at": log.revoked_at,
            "created_at": log.created_at,
        }
        for log, student_name in student_logs
    ]
    history.sort(key=lambda item: item["created_at"], reverse=True)
    return history


def get_group_class_score_history(db: Session, class_id: int) -> list[dict]:
    """Return group-only score history for a class."""
    group_logs = db.query(GroupScoreLog, StudentGroup.name).join(
        StudentGroup,
        StudentGroup.id == GroupScoreLog.group_id,
    ).filter(GroupScoreLog.class_id == class_id).all()

    history = [
        {
            "id": log.id,
            "class_id": log.class_id,
            "group_id": log.group_id,
            "group_name": group_name,
            "score_item_id": log.score_item_id,
            "item_name_snapshot": log.item_name_snapshot,
            "score_delta": log.score_delta,
            "score_type": "plus" if log.score_delta >= 0 else "minus",
            "subject": log.subject,
            "remark": log.remark,
            "is_revoked": log.is_revoked,
            "revoked_by": log.revoked_by,
            "revoked_at": log.revoked_at,
            "created_at": log.created_at,
        }
        for log, group_name in group_logs
    ]
    history.sort(key=lambda item: item["created_at"], reverse=True)
    return history


def get_class_score_history(db: Session, class_id: int) -> list[dict]:
    """Return merged student/group score history for a class."""
    history = [
        {
            **item,
            "type": "student",
            "group_id": None,
            "group_name": None,
        }
        for item in get_student_class_score_history(db, class_id)
    ]
    history.extend(
        {
            **item,
            "type": "group",
            "student_id": None,
            "student_name": None,
        }
        for item in get_group_class_score_history(db, class_id)
    )
    history.sort(key=lambda item: item["created_at"], reverse=True)
    return history
