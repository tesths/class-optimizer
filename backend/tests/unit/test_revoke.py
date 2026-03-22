# -*- coding: utf-8 -*-
"""Points revoke/reversal tests."""
import pytest


def create_score_item(test_client, auth_token, class_id, *, name, score_value, score_type="plus", target_type="student"):
    response = test_client.post(
        f"/api/classes/{class_id}/score-items",
        json={
            "name": name,
            "target_type": target_type,
            "score_type": score_type,
            "score_value": score_value,
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 201
    return response.json()


class TestPointsRevoke:
    """Test points revocation functionality."""

    @pytest.fixture
    def setup_data(self, test_client, auth_token):
        """Setup class, student, and points record."""
        class_resp = test_client.post("/api/classes/", json={"name": "Revoke Class", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        student_resp = test_client.post(f"/api/classes/{class_id}/students",
                                        json={"name": "Revoke Student", "student_no": "R001"},
                                        headers={"Authorization": f"Bearer {auth_token}"})
        student_id = student_resp.json()["id"]
        item = create_score_item(test_client, auth_token, class_id, name="Original points", score_value=15)

        # Add points
        points_resp = test_client.post(f"/api/students/{student_id}/score",
                                       json={"score_item_id": item["id"], "remark": "Original points"},
                                       headers={"Authorization": f"Bearer {auth_token}"})
        points_id = points_resp.json()["id"]

        return class_id, student_id, points_id

    def test_revoke_points_by_admin(self, test_client, auth_token, setup_data):
        """Test admin can revoke specific points record."""
        class_id, student_id, points_id = setup_data
        response = test_client.post(f"/api/student-score-logs/{points_id}/revoke",
                                     headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200

        # Verify points were revoked
        logs_resp = test_client.get(f"/api/students/{student_id}/score-logs",
                                     headers={"Authorization": f"Bearer {auth_token}"})
        logs = logs_resp.json()
        revoked_log = next((log for log in logs if log["id"] == points_id), None)
        assert revoked_log is not None
        assert revoked_log["is_revoked"] == True

    def test_revoke_group_points(self, test_client, auth_token):
        """Test revoking group points."""
        # Setup
        class_resp = test_client.post("/api/classes/", json={"name": "Group Revoke", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        group_resp = test_client.post(f"/api/classes/{class_id}/groups", json={"name": "Revoke Group"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        group_id = group_resp.json()["id"]
        item = create_score_item(test_client, auth_token, class_id, name="Group bonus", score_value=30, target_type="group")

        # Add group points
        points_resp = test_client.post(f"/api/groups/{group_id}/score",
                                       json={"score_item_id": item["id"]},
                                       headers={"Authorization": f"Bearer {auth_token}"})
        points_id = points_resp.json()["id"]

        # Revoke
        response = test_client.post(f"/api/group-score-logs/{points_id}/revoke",
                                     headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200

    def test_teacher_can_only_revoke_own_records(self, test_client):
        """Test teacher can only revoke their own points records."""
        # Teacher 1 creates points
        test_client.post("/api/auth/register", json={
            "username": "teacherA", "password": "passwordA", "confirm_password": "passwordA", "real_name": "T A", "subject": "Math"
        })
        login1 = test_client.post("/api/auth/login", data={"username": "teacherA", "password": "passwordA"})
        token1 = login1.json()["access_token"]

        class1 = test_client.post("/api/classes/", json={"name": "Class A", "grade": "1", "school_year": "2024"},
                                  headers={"Authorization": f"Bearer {token1}"})
        class1_id = class1.json()["id"]
        student1 = test_client.post(f"/api/classes/{class1_id}/students", json={"name": "S1", "student_no": "S001"},
                                   headers={"Authorization": f"Bearer {token1}"})
        student1_id = student1.json()["id"]
        item1 = create_score_item(test_client, token1, class1_id, name="A points", score_value=10)
        points1 = test_client.post(f"/api/students/{student1_id}/score", json={"score_item_id": item1["id"], "remark": "A points"},
                                  headers={"Authorization": f"Bearer {token1}"})
        points1_id = points1.json()["id"]

        # Teacher 2 tries to revoke Teacher 1's points
        test_client.post("/api/auth/register", json={
            "username": "teacherB", "password": "passwordB", "confirm_password": "passwordB", "real_name": "T B", "subject": "English"
        })
        login2 = test_client.post("/api/auth/login", data={"username": "teacherB", "password": "passwordB"})
        token2 = login2.json()["access_token"]

        response = test_client.post(f"/api/student-score-logs/{points1_id}/revoke", headers={"Authorization": f"Bearer {token2}"})
        assert response.status_code == 403

    def test_revoke_already_revoked_student_points(self, test_client, auth_token):
        """Test revoking already revoked student points returns 400."""
        # Setup
        class_resp = test_client.post("/api/classes/", json={"name": "Revoke Twice", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        student_resp = test_client.post(f"/api/classes/{class_id}/students",
                                        json={"name": "Student R", "student_no": "R002"},
                                        headers={"Authorization": f"Bearer {auth_token}"})
        student_id = student_resp.json()["id"]
        item = create_score_item(test_client, auth_token, class_id, name="Student R Points", score_value=10)
        points_resp = test_client.post(f"/api/students/{student_id}/score",
                                       json={"score_item_id": item["id"]},
                                       headers={"Authorization": f"Bearer {auth_token}"})
        points_id = points_resp.json()["id"]

        # First revoke
        test_client.post(f"/api/student-score-logs/{points_id}/revoke",
                         headers={"Authorization": f"Bearer {auth_token}"})

        # Second revoke (should fail)
        response = test_client.post(f"/api/student-score-logs/{points_id}/revoke",
                                    headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 400

    def test_revoke_already_revoked_group_points(self, test_client, auth_token):
        """Test revoking already revoked group points returns 400."""
        # Setup
        class_resp = test_client.post("/api/classes/", json={"name": "Group Revoke Twice", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        group_resp = test_client.post(f"/api/classes/{class_id}/groups", json={"name": "Group G"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        group_id = group_resp.json()["id"]
        item = create_score_item(test_client, auth_token, class_id, name="Group G Points", score_value=20, target_type="group")
        points_resp = test_client.post(f"/api/groups/{group_id}/score",
                                       json={"score_item_id": item["id"]},
                                       headers={"Authorization": f"Bearer {auth_token}"})
        points_id = points_resp.json()["id"]

        # First revoke
        test_client.post(f"/api/group-score-logs/{points_id}/revoke",
                        headers={"Authorization": f"Bearer {auth_token}"})

        # Second revoke (should fail)
        response = test_client.post(f"/api/group-score-logs/{points_id}/revoke",
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 400
