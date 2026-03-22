"""Score Item and Score Log models."""
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ScoreItem(Base):
    """Score Item configuration."""

    __tablename__ = "score_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False, default="student")
    score_type: Mapped[str] = mapped_column(String(10), nullable=False)  # plus or minus
    score_value: Mapped[int] = mapped_column(Integer, nullable=False)
    subject: Mapped[str | None] = mapped_column(String(50))
    color_tag: Mapped[str | None] = mapped_column(String(20))
    icon_name: Mapped[str | None] = mapped_column(String(30))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    class_: Mapped["Class"] = relationship("Class", back_populates="score_items")


class StudentScoreLog(Base):
    """Student Score Log with revoke support."""

    __tablename__ = "student_score_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    operator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    score_item_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("score_items.id"))
    item_name_snapshot: Mapped[str] = mapped_column(String(50), nullable=False)
    score_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    score_type: Mapped[str] = mapped_column(String(10), nullable=False)  # plus or minus
    subject: Mapped[str | None] = mapped_column(String(50))
    remark: Mapped[str | None] = mapped_column(Text)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    revoked_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)
    revoke_source_id: Mapped[int | None] = mapped_column(Integer)  # Points to revoke log id
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)

    # Relationships
    class_: Mapped["Class"] = relationship("Class", back_populates="student_score_logs")
    student: Mapped["Student"] = relationship("Student", back_populates="score_logs")
    operator: Mapped["User"] = relationship("User", foreign_keys=[operator_id])
    score_item: Mapped["ScoreItem"] = relationship("ScoreItem")


class GroupScoreLog(Base):
    """Group Score Log with revoke support."""

    __tablename__ = "group_score_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("student_groups.id"), nullable=False, index=True)
    operator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    score_item_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("score_items.id"))
    item_name_snapshot: Mapped[str] = mapped_column(String(50), nullable=False)
    score_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    subject: Mapped[str | None] = mapped_column(String(50))
    remark: Mapped[str | None] = mapped_column(Text)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    revoked_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)
    revoke_source_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)

    # Relationships
    class_: Mapped["Class"] = relationship("Class", back_populates="group_score_logs")
    group_: Mapped["StudentGroup"] = relationship("StudentGroup", back_populates="score_logs")
    operator: Mapped["User"] = relationship("User", foreign_keys=[operator_id])
    score_item: Mapped["ScoreItem"] = relationship("ScoreItem")
