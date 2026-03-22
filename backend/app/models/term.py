"""Term model."""
from datetime import datetime, date
from sqlalchemy import String, Date, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Term(Base):
    """Semester/Term model."""

    __tablename__ = "terms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="created_terms")
    classes: Mapped[list["Class"]] = relationship("Class", back_populates="term")
