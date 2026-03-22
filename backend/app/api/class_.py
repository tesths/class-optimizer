# -*- coding: utf-8 -*-
"""Class API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import Class, ClassTeacher
from app.models.term import Term
from app.schemas.class_ import (
    ClassCreate, ClassUpdate, ClassResponse,
    TeacherAddRequest, ClassTeacherResponse
)
from app.services.class_service import delete_class_with_related_data
from app.utils.auth import get_user_class_role, require_class_admin
from app.utils.db import commit_or_400

router = APIRouter(prefix="/classes", tags=["班级"])


def validate_term_access(db: Session, term_id: int, user_id: int) -> None:
    """Ensure a referenced term exists and belongs to the current user."""
    term = db.query(Term).filter(Term.id == term_id, Term.created_by == user_id).first()
    if not term:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="学期不存在")


@router.get("", response_model=List[ClassResponse])
async def list_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all classes for current user"""
    class_ids = db.query(ClassTeacher.class_id).filter(
        ClassTeacher.user_id == current_user.id
    ).all()
    ids = [c.class_id for c in class_ids]

    classes = db.query(Class).filter(Class.id.in_(ids)).all()
    result = []
    for cls in classes:
        resp = ClassResponse.model_validate(cls)
        resp.student_count = len(cls.students)
        resp.teacher_count = len(cls.teachers)
        result.append(resp)
    return result


@router.post("", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    data: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new class"""
    if data.term_id is not None:
        validate_term_access(db, data.term_id, current_user.id)

    cls = Class(
        name=data.name,
        grade=data.grade,
        school_year=data.school_year,
        term_id=data.term_id,
        description=data.description,
        visual_theme=data.visual_theme,
        group_growth_thresholds=data.group_growth_thresholds,
        creator_id=current_user.id
    )
    cls.teachers.append(ClassTeacher(user_id=current_user.id, role="class_admin"))
    db.add(cls)
    commit_or_400(db, "班级名称与学年组合已存在")
    db.refresh(cls)

    resp = ClassResponse.model_validate(cls)
    resp.teacher_count = 1
    return resp


@router.get("/{class_id}", response_model=ClassResponse)
async def get_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get class details"""
    role = get_user_class_role(db, class_id, current_user.id)
    if not role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")

    resp = ClassResponse.model_validate(cls)
    resp.student_count = len(cls.students)
    resp.teacher_count = len(cls.teachers)
    return resp


@router.put("/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: int,
    data: ClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update class"""
    cls = require_class_admin(db, class_id, current_user)

    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("term_id") is not None:
        validate_term_access(db, update_data["term_id"], current_user.id)
    for key, value in update_data.items():
        setattr(cls, key, value)

    commit_or_400(db, "班级名称与学年组合已存在")
    db.refresh(cls)

    resp = ClassResponse.model_validate(cls)
    resp.student_count = len(cls.students)
    resp.teacher_count = len(cls.teachers)
    return resp


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete class"""
    require_class_admin(db, class_id, current_user)
    delete_class_with_related_data(db, class_id)
    db.commit()


@router.get("/{class_id}/teachers", response_model=List[ClassTeacherResponse])
async def list_teachers(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List class teachers"""
    if not get_user_class_role(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    teachers = db.query(ClassTeacher).filter(ClassTeacher.class_id == class_id).all()
    result = []
    for t in teachers:
        resp = ClassTeacherResponse(
            id=t.id,
            class_id=t.class_id,
            user_id=t.user_id,
            role=t.role,
            user={"id": t.user.id, "username": t.user.username}
        )
        result.append(resp)
    return result


@router.post("/{class_id}/teachers", response_model=ClassTeacherResponse, status_code=status.HTTP_201_CREATED)
async def add_teacher(
    class_id: int,
    data: TeacherAddRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a teacher to class"""
    require_class_admin(db, class_id, current_user)

    target_user = db.query(User).filter(User.username == data.username).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    existing = db.query(ClassTeacher).filter(
        ClassTeacher.class_id == class_id,
        ClassTeacher.user_id == target_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该教师已在班级中")

    ct = ClassTeacher(class_id=class_id, user_id=target_user.id, role=data.role)
    db.add(ct)
    db.commit()
    db.refresh(ct)

    resp = ClassTeacherResponse(
        id=ct.id,
        class_id=ct.class_id,
        user_id=ct.user_id,
        role=ct.role,
        user={"id": target_user.id, "username": target_user.username}
    )
    return resp


@router.delete("/{class_id}/teachers/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_teacher(
    class_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a teacher from class"""
    require_class_admin(db, class_id, current_user)

    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能移除自己")

    db.query(ClassTeacher).filter(
        ClassTeacher.class_id == class_id,
        ClassTeacher.user_id == user_id
    ).delete()
    db.commit()
