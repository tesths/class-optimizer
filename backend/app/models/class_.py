"""Class and ClassTeacher models."""
from datetime import datetime
from sqlalchemy import JSON, String, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.utils.growth import DEFAULT_GROUP_GROWTH_THRESHOLDS


class Class(Base):
    """Class model."""

    __tablename__ = "classes"
    __table_args__ = (UniqueConstraint("name", "school_year", name="uix_class_name_year"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    grade: Mapped[str | None] = mapped_column(String(20))
    school_year: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    term_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("terms.id"))
    description: Mapped[str | None] = mapped_column(Text)
    visual_theme: Mapped[str] = mapped_column(String(20), default="farm")  # farm or tree
    group_growth_thresholds: Mapped[list[int]] = mapped_column(
        JSON,
        default=lambda: DEFAULT_GROUP_GROWTH_THRESHOLDS.copy(),
        nullable=False,
    )
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    term: Mapped["Term"] = relationship("Term", back_populates="classes")
    creator: Mapped["User"] = relationship("User", back_populates="created_classes")
    teachers: Mapped[list["ClassTeacher"]] = relationship("ClassTeacher", back_populates="class_")
    students: Mapped[list["Student"]] = relationship("Student", back_populates="class_", cascade="all, delete-orphan")
    groups: Mapped[list["StudentGroup"]] = relationship("StudentGroup", back_populates="class_", cascade="all, delete-orphan")
    score_items: Mapped[list["ScoreItem"]] = relationship("ScoreItem", back_populates="class_", cascade="all, delete-orphan")
    student_score_logs: Mapped[list["StudentScoreLog"]] = relationship("StudentScoreLog", back_populates="class_")
    group_score_logs: Mapped[list["GroupScoreLog"]] = relationship("GroupScoreLog", back_populates="class_")
    import_jobs: Mapped[list["ImportJob"]] = relationship("ImportJob", back_populates="class_")


class ClassTeacher(Base):
    """Class-Teacher association with role."""

    __tablename__ = "class_teachers"
    __table_args__ = (UniqueConstraint("class_id", "user_id", name="uix_class_teacher"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="class_teacher")  # class_admin or class_teacher
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    class_: Mapped["Class"] = relationship("Class", back_populates="teachers")
    user: Mapped["User"] = relationship("User")
