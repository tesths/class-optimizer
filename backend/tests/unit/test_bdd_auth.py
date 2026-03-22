# -*- coding: utf-8 -*-
"""Auth BDD-style tests."""
import pytest


class TestAuthBDD:
    """Test auth BDD scenarios."""

    def test_register_and_login(self, test_client):
        """Test successful registration and login."""
        # Register
        register_resp = test_client.post("/api/auth/register", json={
            "username": "teacher1",
            "password": "Pass123",
            "confirm_password": "Pass123",
            "real_name": "张老师",
            "subject": "数学"
        })
        assert register_resp.status_code in [200, 201]

        # Login
        login_resp = test_client.post("/api/auth/login", data={
            "username": "teacher1",
            "password": "Pass123"
        })
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "access_token" in data

        # Access class list
        token = data["access_token"]
        list_resp = test_client.get("/api/classes/", headers={
            "Authorization": f"Bearer {token}"
        })
        assert list_resp.status_code == 200
