# -*- coding: utf-8 -*-
"""Database helpers for consistent transaction handling."""
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def commit_or_400(db: Session, detail: str) -> None:
    """Commit the current transaction or surface a user-facing 400 error."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
