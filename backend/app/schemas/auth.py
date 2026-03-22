# -*- coding: utf-8 -*-
"""Auth schemas for request/response validation."""
from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Login request schema"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    """Register request schema"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    confirm_password: str
    real_name: str = Field(..., min_length=1, max_length=50)
    subject: str = Field(..., min_length=1, max_length=50)


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User response schema"""
    id: int
    username: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TeacherProfileResponse(BaseModel):
    """Teacher profile response"""
    id: int
    real_name: str
    subject: str
    phone: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    bio: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserDetailResponse(UserResponse):
    """User with teacher profile"""
    teacher_profile: TeacherProfileResponse | None = None

    model_config = ConfigDict(from_attributes=True)
