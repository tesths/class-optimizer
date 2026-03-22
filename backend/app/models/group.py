# -*- coding: utf-8 -*-
"""Student Group and GroupMember models."""
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class StudentGroup(Base):
    """Student Group model."""

    __tablename__ = "student_groups"
    __table_args__ = (UniqueConstraint("class_id", "name", name="uix_class_group_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    leader_student_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    class_: Mapped["Class"] = relationship("Class", back_populates="groups")
    members: Mapped[list["GroupMember"]] = relationship("GroupMember", back_populates="group_", cascade="all, delete-orphan")
    students: Mapped[list["Student"]] = relationship("Student", back_populates="group", foreign_keys="Student.group_id")
    score_logs: Mapped[list["GroupScoreLog"]] = relationship("GroupScoreLog", back_populates="group_")


class GroupMember(Base):
    """Group Member association."""

    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("student_id", name="uix_group_member_student"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("student_groups.id"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    group_: Mapped["StudentGroup"] = relationship("StudentGroup", back_populates="members")
    student: Mapped["Student"] = relationship("Student", back_populates="group_membership")
