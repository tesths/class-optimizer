"""Student model."""
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Student(Base):
    """Student model."""

    __tablename__ = "students"
    __table_args__ = (UniqueConstraint("class_id", "student_no", name="uix_class_student_no"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    student_no: Mapped[str] = mapped_column(String(20), nullable=False)
    gender: Mapped[str | None] = mapped_column(String(10))
    seat_no: Mapped[str | None] = mapped_column(String(10))
    avatar_url: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(String(255))
    group_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("student_groups.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    class_: Mapped["Class"] = relationship("Class", back_populates="students")
    group: Mapped["StudentGroup"] = relationship("StudentGroup", back_populates="students", foreign_keys=[group_id])
    score_logs: Mapped[list["StudentScoreLog"]] = relationship("StudentScoreLog", back_populates="student")
    group_membership: Mapped["GroupMember"] = relationship("GroupMember", back_populates="student", uselist=False)
