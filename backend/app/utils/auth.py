# -*- coding: utf-8 -*-
"""Common authentication and authorization utilities."""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.class_ import Class, ClassTeacher
from app.models.user import User


def check_class_access(db: Session, class_id: int, user_id: int) -> bool:
    """Check if user has access to class"""
    return db.query(ClassTeacher).filter(
        ClassTeacher.class_id == class_id,
        ClassTeacher.user_id == user_id
    ).first() is not None


def check_class_admin(db: Session, class_id: int, user_id: int) -> bool:
    """Check if user is class admin"""
    ct = db.query(ClassTeacher).filter(
        ClassTeacher.class_id == class_id,
        ClassTeacher.user_id == user_id,
        ClassTeacher.role == "class_admin"
    ).first()
    return ct is not None


def get_user_class_role(db: Session, class_id: int, user_id: int) -> str | None:
    """Get user's role in a class"""
    ct = db.query(ClassTeacher).filter(
        ClassTeacher.class_id == class_id,
        ClassTeacher.user_id == user_id
    ).first()
    return ct.role if ct else None


def require_class_admin(db: Session, class_id: int, user: User) -> Class:
    """Require user to be class admin, raises HTTPException if not"""
    role = get_user_class_role(db, class_id, user.id)
    if role != "class_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要班级管理员权限")
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="班级不存在")
    return cls
