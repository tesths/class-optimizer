# -*- coding: utf-8 -*-
"""Student scoring BDD-style tests."""
import pytest


class TestStudentScoringBDD:
    """Test student scoring BDD scenarios."""

    def test_add_student_score(self, test_client):
        """Test adding score to student."""
        # Setup teacher and class
        test_client.post("/api/auth/register", json={
            "username": "scoreteacher",
            "password": "Pass123",
            "confirm_password": "Pass123",
            "real_name": "评分老师",
            "subject": "数学"
        })
        login_resp = test_client.post("/api/auth/login", data={
            "username": "scoreteacher",
            "password": "Pass123"
        })
        token = login_resp.json()["access_token"]

        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "评分测试班", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {token}"}
        )
        class_id = class_resp.json()["id"]

        # Create student
        student_resp = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "001"},
            headers={"Authorization": f"Bearer {token}"}
        )
        student_id = student_resp.json()["id"]

        # Get original score
        original_score = student_resp.json().get("total_score", 0)

        # Create score item
        item_resp = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={"name": "课堂发言", "target_type": "student", "score_type": "plus", "score_value": 2, "subject": "数学"},
            headers={"Authorization": f"Bearer {token}"}
        )
        score_item_id = item_resp.json()["id"]

        # Add score to student
        score_resp = test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": score_item_id, "subject": "数学"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert score_resp.status_code == 201

        # Verify score increased
        student_check = test_client.get(
            f"/api/classes/{class_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        new_score = student_check.json().get("total_score", 0)
        assert new_score >= original_score + 2

        # Verify history increased
        logs_resp = test_client.get(
            f"/api/students/{student_id}/score-logs",
            headers={"Authorization": f"Bearer {token}"}
        )
        logs = logs_resp.json()
        assert len(logs) >= 1

    def test_revoke_score_as_admin(self, test_client):
        """Test revoking score as admin."""
        # Setup admin teacher and class
        test_client.post("/api/auth/register", json={
            "username": "admintest",
            "password": "Pass123",
            "confirm_password": "Pass123",
            "real_name": "管理员老师",
            "subject": "数学"
        })
        login_resp = test_client.post("/api/auth/login", data={
            "username": "admintest",
            "password": "Pass123"
        })
        token = login_resp.json()["access_token"]

        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "管理员测试班", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {token}"}
        )
        class_id = class_resp.json()["id"]

        # Create student
        student_resp = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "王小明", "student_no": "002"},
            headers={"Authorization": f"Bearer {token}"}
        )
        student_id = student_resp.json()["id"]
        item_resp = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={"name": "管理员撤销项", "target_type": "student", "score_type": "plus", "score_value": 5, "subject": "数学"},
            headers={"Authorization": f"Bearer {token}"}
        )
        score_item_id = item_resp.json()["id"]

        # Add a score to revoke later
        score_resp = test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": score_item_id, "subject": "数学"},
            headers={"Authorization": f"Bearer {token}"}
        )
        score_log_id = score_resp.json()["id"]

        # Revoke the score
        revoke_resp = test_client.post(
            f"/api/student-score-logs/{score_log_id}/revoke",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert revoke_resp.status_code == 200
        data = revoke_resp.json()
        assert "message" in data or data.get("is_revoked") is True
