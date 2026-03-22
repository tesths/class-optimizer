# -*- coding: utf-8 -*-
"""Score item API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import ClassTeacher
from app.models.score import ScoreItem
from app.schemas.score import (
    ScoreItemCreate, ScoreItemUpdate, ScoreItemResponse
)

router = APIRouter(prefix="/classes/{class_id}/score-items", tags=["积分项目"])


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


@router.get("", response_model=List[ScoreItemResponse])
async def list_score_items(
    class_id: int,
    enabled_only: bool = False,
    target_type: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List score items in a class"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    query = db.query(ScoreItem).filter(ScoreItem.class_id == class_id)
    if enabled_only:
        query = query.filter(ScoreItem.enabled == True)
    if target_type:
        if target_type not in {"student", "group"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="积分项目类型不合法")
        query = query.filter(ScoreItem.target_type == target_type)
    return query.order_by(ScoreItem.sort_order, ScoreItem.id).all()


@router.post("", response_model=ScoreItemResponse, status_code=status.HTTP_201_CREATED)
async def create_score_item(
    class_id: int,
    data: ScoreItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new score item"""
    if not check_class_admin(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要班级管理员权限")

    item = ScoreItem(
        class_id=class_id,
        name=data.name,
        target_type=data.target_type,
        score_type=data.score_type,
        score_value=data.score_value,
        subject=data.subject,
        color_tag=data.color_tag,
        icon_name=data.icon_name,
        enabled=data.enabled,
        sort_order=data.sort_order
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=ScoreItemResponse)
async def update_score_item(
    class_id: int,
    item_id: int,
    data: ScoreItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a score item"""
    if not check_class_admin(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要班级管理员权限")

    item = db.query(ScoreItem).filter(
        ScoreItem.id == item_id,
        ScoreItem.class_id == class_id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_score_item(
    class_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a score item"""
    if not check_class_admin(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要班级管理员权限")

    item = db.query(ScoreItem).filter(
        ScoreItem.id == item_id,
        ScoreItem.class_id == class_id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")

    db.delete(item)
    db.commit()
