# -*- coding: utf-8 -*-
"""Term API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import Class
from app.models.term import Term
from app.schemas.term import TermCreate, TermUpdate, TermResponse

router = APIRouter(prefix="/terms", tags=["学期"])


@router.get("", response_model=List[TermResponse])
async def list_terms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all terms"""
    return db.query(Term).filter(Term.created_by == current_user.id).all()


@router.post("", response_model=TermResponse, status_code=status.HTTP_201_CREATED)
async def create_term(
    data: TermCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new term"""
    if data.end_date <= data.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="结束日期必须晚于开始日期")

    term = Term(
        name=data.name,
        start_date=data.start_date,
        end_date=data.end_date,
        created_by=current_user.id
    )
    db.add(term)
    db.commit()
    db.refresh(term)
    return term


@router.put("/{term_id}", response_model=TermResponse)
async def update_term(
    term_id: int,
    data: TermUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a term"""
    term = db.query(Term).filter(Term.id == term_id, Term.created_by == current_user.id).first()
    if not term:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学期不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(term, key, value)

    db.commit()
    db.refresh(term)
    return term


@router.delete("/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_term(
    term_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a term"""
    term = db.query(Term).filter(Term.id == term_id, Term.created_by == current_user.id).first()
    if not term:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学期不存在")
    db.query(Class).filter(Class.term_id == term_id).update(
        {Class.term_id: None},
        synchronize_session=False,
    )
    db.delete(term)
    db.commit()
