# -*- coding: utf-8 -*-
"""Term schemas."""
from pydantic import BaseModel, ConfigDict
from datetime import date


class TermCreate(BaseModel):
    """Create term request"""
    name: str
    start_date: date
    end_date: date


class TermUpdate(BaseModel):
    """Update term request"""
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class TermResponse(BaseModel):
    """Term response"""
    id: int
    name: str
    start_date: date
    end_date: date
    created_by: int

    model_config = ConfigDict(from_attributes=True)
