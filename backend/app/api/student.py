# -*- coding: utf-8 -*-
"""Student API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.group import GroupMember
from app.models.score import StudentScoreLog
from app.models.user import User
from app.models.student import Student
from app.models.group import StudentGroup
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.utils.auth import check_class_access
from app.utils.db import commit_or_400
from app.services.student_service import (
    enrich_student_response,
    get_class_theme,
    sync_student_group_membership,
)

router = APIRouter(prefix="/classes/{class_id}/students", tags=["学生"])
GROUP_ID_UNSET = object()


@router.get("", response_model=List[StudentResponse])
async def list_students(
    class_id: int,
    group_id: int | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List students in a class"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    query = db.query(Student).filter(Student.class_id == class_id)

    if group_id:
        query = query.filter(Student.group_id == group_id)
    if search:
        query = query.filter(Student.name.contains(search) | Student.student_no.contains(search))

    students = query.order_by(Student.name).all()

    theme = get_class_theme(db, class_id)
    return [enrich_student_response(db, s, theme) for s in students]


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    class_id: int,
    data: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new student"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    existing = db.query(Student).filter(
        Student.class_id == class_id,
        Student.student_no == data.student_no
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="学号已存在")

    student = Student(
        class_id=class_id,
        name=data.name,
        student_no=data.student_no,
        gender=data.gender,
        seat_no=data.seat_no,
        notes=data.notes,
        group_id=None
    )
    db.add(student)
    sync_student_group_membership(db, student, data.group_id)
    commit_or_400(db, "学号已存在")
    db.refresh(student)

    theme = get_class_theme(db, class_id)
    return enrich_student_response(db, student, theme)


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get student details"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    student = db.query(Student).filter(Student.id == student_id, Student.class_id == class_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")

    theme = get_class_theme(db, class_id)
    return enrich_student_response(db, student, theme)


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    class_id: int,
    student_id: int,
    data: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update student"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    student = db.query(Student).filter(Student.id == student_id, Student.class_id == class_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")

    update_data = data.model_dump(exclude_unset=True)
    group_id = update_data.pop("group_id", GROUP_ID_UNSET)
    previous_group_id = student.group_id
    for key, value in update_data.items():
        setattr(student, key, value)

    if group_id is not GROUP_ID_UNSET:
        sync_student_group_membership(db, student, group_id)
        if previous_group_id and previous_group_id != student.group_id:
            db.query(StudentGroup).filter(
                StudentGroup.id == previous_group_id,
                StudentGroup.leader_student_id == student_id,
            ).update({StudentGroup.leader_student_id: None}, synchronize_session=False)

    commit_or_400(db, "学号已存在")
    db.refresh(student)

    theme = get_class_theme(db, class_id)
    return enrich_student_response(db, student, theme)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete student"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    student = db.query(Student).filter(Student.id == student_id, Student.class_id == class_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")

    db.query(StudentGroup).filter(StudentGroup.leader_student_id == student_id).update(
        {StudentGroup.leader_student_id: None},
        synchronize_session=False,
    )
    db.query(GroupMember).filter(GroupMember.student_id == student_id).delete(
        synchronize_session=False
    )
    db.query(StudentScoreLog).filter(StudentScoreLog.student_id == student_id).delete()
    db.delete(student)
    db.commit()
