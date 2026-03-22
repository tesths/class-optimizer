# -*- coding: utf-8 -*-
"""Authentication module tests."""
import pytest
from datetime import datetime
from app.core.security import create_access_token
from app.models.user import User


class TestAuthRegistration:
    """Test user registration."""

    def test_register_teacher_success(self, test_client):
        """Test successful teacher registration."""
        response = test_client.post("/api/auth/register", json={
            "username": "newteacher",
            "password": "password123",
            "confirm_password": "password123",
            "real_name": "New Teacher",
            "subject": "English"
        })
        assert response.status_code == 201
        data = response.json()
        assert "message" in data

    def test_register_duplicate_username(self, test_client):
        """Test registration with duplicate username."""
        test_client.post("/api/auth/register", json={
            "username": "duplicate",
            "password": "password1",
            "confirm_password": "password1",
            "real_name": "Teacher 1",
            "subject": "Math"
        })
        response = test_client.post("/api/auth/register", json={
            "username": "duplicate",
            "password": "password2",
            "confirm_password": "password2",
            "real_name": "Teacher 2",
            "subject": "English"
        })
        assert response.status_code == 400
        detail = response.json()["detail"].lower()
        assert "username" in detail or "用户" in detail


class TestAuthLogin:
    """Test user login."""

    def test_login_success(self, test_client):
        """Test successful login."""
        test_client.post("/api/auth/register", json={
            "username": "logintest",
            "password": "correctpass",
            "confirm_password": "correctpass",
            "real_name": "Login Test",
            "subject": "Science"
        })
        response = test_client.post("/api/auth/login", data={
            "username": "logintest",
            "password": "correctpass"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, test_client):
        """Test login with wrong password."""
        test_client.post("/api/auth/register", json={
            "username": "wrongpass",
            "password": "correct",
            "confirm_password": "correct",
            "real_name": "Test",
            "subject": "Art"
        })
        response = test_client.post("/api/auth/login", data={
            "username": "wrongpass",
            "password": "incorrect"
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, test_client):
        """Test login with non-existent user."""
        response = test_client.post("/api/auth/login", data={
            "username": "notexists",
            "password": "password"
        })
        assert response.status_code == 401


class TestAuthJWT:
    """Test JWT token functionality."""

    def test_jwt_token_contains_required_claims(self, test_client):
        """Test JWT token structure."""
        test_client.post("/api/auth/register", json={
            "username": "jwttest",
            "password": "pass123",
            "confirm_password": "pass123",
            "real_name": "JWT Test",
            "subject": "History"
        })
        response = test_client.post("/api/auth/login", data={
            "username": "jwttest",
            "password": "pass123"
        })
        token = response.json()["access_token"]
        assert len(token) > 0

    def test_protected_route_requires_token(self, test_client):
        """Test accessing protected route without token."""
        response = test_client.get("/api/auth/me")
        assert response.status_code == 401

    def test_deactivated_user_token_is_rejected(self, test_client, db_session):
        """Existing tokens should stop working after the user is disabled."""
        test_client.post("/api/auth/register", json={
            "username": "disableduser",
            "password": "pass1234",
            "confirm_password": "pass1234",
            "real_name": "Disabled User",
            "subject": "History"
        })
        login = test_client.post("/api/auth/login", data={
            "username": "disableduser",
            "password": "pass1234"
        })
        token = login.json()["access_token"]

        user = db_session.query(User).filter(User.username == "disableduser").first()
        user.is_active = False
        db_session.commit()

        response = test_client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401

    def test_invalid_sub_claim_returns_401(self, test_client):
        """Malformed but signed tokens should be rejected as unauthorized."""
        token = create_access_token(data={"sub": "not-an-int"})

        response = test_client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401
