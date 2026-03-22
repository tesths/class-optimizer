# -*- coding: utf-8 -*-
"""Class-related business logic services."""
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.class_ import Class, ClassTeacher
from app.models.group import GroupMember, StudentGroup
from app.models.import_job import ImportJob
from app.models.score import GroupScoreLog, ScoreItem, StudentScoreLog
from app.models.student import Student


def delete_class_with_related_data(db: Session, class_id: int) -> None:
    """Delete a class and all related rows without relying on DB cascades."""
    student_ids = [
        row.id for row in db.query(Student.id).filter(Student.class_id == class_id).all()
    ]
    group_ids = [
        row.id for row in db.query(StudentGroup.id).filter(StudentGroup.class_id == class_id).all()
    ]

    if student_ids or group_ids:
        filters = []
        if student_ids:
            filters.append(GroupMember.student_id.in_(student_ids))
        if group_ids:
            filters.append(GroupMember.group_id.in_(group_ids))
        db.query(GroupMember).filter(or_(*filters)).delete(synchronize_session=False)

    db.query(StudentScoreLog).filter(StudentScoreLog.class_id == class_id).delete(
        synchronize_session=False
    )
    db.query(GroupScoreLog).filter(GroupScoreLog.class_id == class_id).delete(
        synchronize_session=False
    )
    db.query(ImportJob).filter(ImportJob.class_id == class_id).delete(
        synchronize_session=False
    )
    db.query(ScoreItem).filter(ScoreItem.class_id == class_id).delete(
        synchronize_session=False
    )
    db.query(Student).filter(Student.class_id == class_id).delete(
        synchronize_session=False
    )
    db.query(StudentGroup).filter(StudentGroup.class_id == class_id).delete(
        synchronize_session=False
    )
    db.query(ClassTeacher).filter(ClassTeacher.class_id == class_id).delete(
        synchronize_session=False
    )
    db.query(Class).filter(Class.id == class_id).delete(synchronize_session=False)
