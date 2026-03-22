# -*- coding: utf-8 -*-
"""Student-related business logic services."""
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.group import GroupMember, StudentGroup
from app.models.score import StudentScoreLog
from app.models.class_ import Class
from app.schemas.student import StudentResponse
from app.utils.growth import calculate_growth_stage


def get_student_total_score(db: Session, student_id: int) -> int:
    """Calculate total score for a student from non-revoked logs."""
    total = db.query(func.coalesce(func.sum(StudentScoreLog.score_delta), 0)).filter(
        StudentScoreLog.student_id == student_id,
        StudentScoreLog.is_revoked == False
    ).scalar()
    return total or 0


def enrich_student_response(db: Session, student: Student, theme: str = "farm") -> StudentResponse:
    """Add computed fields (group_name, total_score, growth_stage) to student response."""
    resp = StudentResponse.model_validate(student)

    if student.group_id:
        group = db.query(StudentGroup).filter(
            StudentGroup.id == student.group_id,
            StudentGroup.class_id == student.class_id,
        ).first()
        if group:
            resp.group_name = group.name

    resp.total_score = get_student_total_score(db, student.id)
    resp.growth_stage = calculate_growth_stage(resp.total_score, theme)

    return resp


def get_class_theme(db: Session, class_id: int) -> str:
    """Get the visual theme for a class."""
    cls = db.query(Class).filter(Class.id == class_id).first()
    return cls.visual_theme if cls else "farm"


def validate_class_group(db: Session, class_id: int, group_id: int) -> StudentGroup:
    """Ensure a group exists and belongs to the given class."""
    group = db.query(StudentGroup).filter(
        StudentGroup.id == group_id,
        StudentGroup.class_id == class_id,
    ).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="小组不存在或不属于当前班级",
        )
    return group


def sync_student_group_membership(
    db: Session,
    student: Student,
    group_id: int | None,
) -> StudentGroup | None:
    """Keep students.group_id and group_members rows in sync."""
    if group_id is None:
        student.group_id = None
        if student.id is not None:
            db.query(GroupMember).filter(GroupMember.student_id == student.id).delete(
                synchronize_session=False
            )
        return None

    group = validate_class_group(db, student.class_id, group_id)
    student.group_id = group.id

    if student.id is None:
        db.add(GroupMember(group_id=group.id, student=student))
        return group

    db.query(GroupMember).filter(GroupMember.student_id == student.id).delete(
        synchronize_session=False
    )
    db.flush()
    db.add(GroupMember(group_id=group.id, student_id=student.id))

    return group
