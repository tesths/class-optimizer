# -*- coding: utf-8 -*-
"""Class management BDD-style tests."""
import pytest


class TestClassManagementBDD:
    """Test class management BDD scenarios."""

    def test_create_new_class(self, test_client):
        """Test creating a new class."""
        # Register and login as teacher
        test_client.post("/api/auth/register", json={
            "username": "classteacher",
            "password": "Pass123",
            "confirm_password": "Pass123",
            "real_name": "王老师",
            "subject": "数学"
        })
        login_resp = test_client.post("/api/auth/login", data={
            "username": "classteacher",
            "password": "Pass123"
        })
        token = login_resp.json()["access_token"]

        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "初一(1)班", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert class_resp.status_code in [200, 201]

        # Verify class appears in list
        list_resp = test_client.get(
            "/api/classes/",
            headers={"Authorization": f"Bearer {token}"}
        )
        classes = list_resp.json()
        class_names = [c["name"] for c in classes]
        assert "初一(1)班" in class_names

    def test_non_admin_cannot_delete_class(self, test_client):
        """Test that non-admin cannot delete class."""
        # Register and login as admin
        test_client.post("/api/auth/register", json={
            "username": "adminteacher",
            "password": "Pass123",
            "confirm_password": "Pass123",
            "real_name": "张老师",
            "subject": "数学"
        })
        admin_login = test_client.post("/api/auth/login", data={
            "username": "adminteacher",
            "password": "Pass123"
        })
        admin_token = admin_login.json()["access_token"]

        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Test Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        class_id = class_resp.json()["id"]

        # Register and add co-teacher
        test_client.post("/api/auth/register", json={
            "username": "codoc",
            "password": "Pass123",
            "confirm_password": "Pass123",
            "real_name": "李老师",
            "subject": "英语"
        })

        test_client.post(
            f"/api/classes/{class_id}/teachers",
            json={"username": "codoc", "role": "class_teacher"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # Login as co-teacher
        co_login = test_client.post("/api/auth/login", data={
            "username": "codoc",
            "password": "Pass123"
        })
        co_token = co_login.json()["access_token"]

        # Try to delete class (should fail)
        delete_resp = test_client.delete(
            f"/api/classes/{class_id}",
            headers={"Authorization": f"Bearer {co_token}"}
        )
        assert delete_resp.status_code in [403, 404]
