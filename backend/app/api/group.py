# -*- coding: utf-8 -*-
"""Group API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import ClassTeacher
from app.models.student import Student
from app.models.group import StudentGroup, GroupMember
from app.models.score import GroupScoreLog
from app.schemas.group import (
    GroupCreate, GroupUpdate, GroupResponse,
    GroupMemberAdd, GroupMemberResponse
)
from app.services.student_service import sync_student_group_membership, validate_class_group
from app.utils.db import commit_or_400

router = APIRouter(prefix="/classes/{class_id}/groups", tags=["小组"])


def check_class_access(db: Session, class_id: int, user_id: int) -> bool:
    """Check if user has access to class"""
    return db.query(ClassTeacher).filter(
        ClassTeacher.class_id == class_id,
        ClassTeacher.user_id == user_id
    ).first() is not None


def serialize_group_member(member: GroupMember) -> GroupMemberResponse:
    """Serialize a group member with a flat student payload."""
    return GroupMemberResponse(
        id=member.id,
        group_id=member.group_id,
        student_id=member.student_id,
        student={"id": member.student.id, "name": member.student.name, "student_no": member.student.student_no}
    )


def validate_leader_student(db: Session, class_id: int, leader_student_id: int | None) -> Student | None:
    """Ensure a designated group leader belongs to the same class."""
    if leader_student_id is None:
        return None
    leader = db.query(Student).filter(
        Student.id == leader_student_id,
        Student.class_id == class_id,
    ).first()
    if not leader:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="组长学生不存在")
    return leader


def sync_group_leader_membership(
    db: Session,
    group: StudentGroup,
    leader_student_id: int | None,
) -> None:
    """Keep the leader field and actual group membership consistent."""
    if leader_student_id is None:
        group.leader_student_id = None
        return

    leader = validate_leader_student(db, group.class_id, leader_student_id)
    previous_group_id = leader.group_id
    sync_student_group_membership(db, leader, group.id)
    group.leader_student_id = leader.id

    if previous_group_id and previous_group_id != group.id:
        db.query(StudentGroup).filter(
            StudentGroup.id == previous_group_id,
            StudentGroup.leader_student_id == leader.id,
        ).update({StudentGroup.leader_student_id: None}, synchronize_session=False)


@router.get("", response_model=List[GroupResponse])
async def list_groups(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List groups in a class"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    groups = db.query(StudentGroup).filter(StudentGroup.class_id == class_id).all()
    result = []
    for g in groups:
        resp = GroupResponse.model_validate(g)
        resp.member_count = len(g.members)

        # Calculate total score
        from app.models.score import GroupScoreLog
        total = db.query(func.coalesce(func.sum(GroupScoreLog.score_delta), 0)).filter(
            GroupScoreLog.group_id == g.id,
            GroupScoreLog.is_revoked == False
        ).scalar()
        resp.total_score = total or 0
        result.append(resp)

    return result


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    class_id: int,
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new group"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    existing = db.query(StudentGroup).filter(
        StudentGroup.class_id == class_id,
        StudentGroup.name == data.name
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="小组名已存在")

    group = StudentGroup(
        class_id=class_id,
        name=data.name,
        leader_student_id=None
    )
    db.add(group)
    db.flush()
    sync_group_leader_membership(db, group, data.leader_student_id)
    commit_or_400(db, "小组名已存在")
    db.refresh(group)
    resp = GroupResponse.model_validate(group)
    resp.member_count = len(group.members)
    return resp


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    class_id: int,
    group_id: int,
    data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a group"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    group = db.query(StudentGroup).filter(
        StudentGroup.id == group_id,
        StudentGroup.class_id == class_id
    ).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="小组不存在")

    update_data = data.model_dump(exclude_unset=True)
    leader_student_id = update_data.pop("leader_student_id", None) if "leader_student_id" in update_data else None
    has_leader_update = "leader_student_id" in data.model_fields_set
    for key, value in update_data.items():
        setattr(group, key, value)

    if has_leader_update:
        sync_group_leader_membership(db, group, leader_student_id)

    commit_or_400(db, "小组名已存在")
    db.refresh(group)
    resp = GroupResponse.model_validate(group)
    resp.member_count = len(group.members)
    return resp


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    class_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a group"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    group = db.query(StudentGroup).filter(
        StudentGroup.id == group_id,
        StudentGroup.class_id == class_id
    ).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="小组不存在")

    db.query(Student).filter(Student.group_id == group_id).update(
        {Student.group_id: None},
        synchronize_session=False
    )
    db.query(GroupMember).filter(GroupMember.group_id == group_id).delete()
    db.query(GroupScoreLog).filter(GroupScoreLog.group_id == group_id).delete()
    db.delete(group)
    db.commit()


@router.get("/{group_id}/members", response_model=List[GroupMemberResponse])
async def list_members(
    class_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List group members"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    # Verify group belongs to this class
    group = db.query(StudentGroup).filter(
        StudentGroup.id == group_id,
        StudentGroup.class_id == class_id
    ).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="小组不存在")

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [serialize_group_member(member) for member in members]


@router.post("/{group_id}/members", response_model=GroupMemberResponse)
async def add_member(
    class_id: int,
    group_id: int,
    data: GroupMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a member to group"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    validate_class_group(db, class_id, group_id)

    student = db.query(Student).filter(
        Student.id == data.student_id,
        Student.class_id == class_id
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学生不存在")

    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.student_id == data.student_id
    ).first()
    if existing:
        # Already a member of this group - return success with the existing record
        return serialize_group_member(existing)

    previous_group_id = student.group_id
    sync_student_group_membership(db, student, group_id)
    if previous_group_id and previous_group_id != group_id:
        db.query(StudentGroup).filter(
            StudentGroup.id == previous_group_id,
            StudentGroup.leader_student_id == data.student_id,
        ).update({StudentGroup.leader_student_id: None}, synchronize_session=False)
    db.commit()

    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.student_id == data.student_id,
    ).first()
    return serialize_group_member(member)


@router.delete("/{group_id}/members/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    class_id: int,
    group_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a member from group"""
    if not check_class_access(db, class_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问该班级")

    # Verify group belongs to this class
    group = db.query(StudentGroup).filter(
        StudentGroup.id == group_id,
        StudentGroup.class_id == class_id
    ).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="小组不存在")

    if group.leader_student_id == student_id:
        group.leader_student_id = None

    student = db.query(Student).filter(Student.id == student_id, Student.class_id == class_id).first()
    if student and student.group_id == group_id:
        student.group_id = None

    db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.student_id == student_id
    ).delete(synchronize_session=False)
    db.commit()
