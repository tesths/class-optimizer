# -*- coding: utf-8 -*-
"""User schemas."""
from pydantic import BaseModel, Field


class ProfileUpdateRequest(BaseModel):
    """Profile update request"""
    real_name: str | None = Field(None, min_length=1, max_length=50)
    subject: str | None = Field(None, min_length=1, max_length=50)
    phone: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    bio: str | None = None


class PasswordChangeRequest(BaseModel):
    """Password change request"""
    old_password: str
    new_password: str = Field(..., min_length=6)
