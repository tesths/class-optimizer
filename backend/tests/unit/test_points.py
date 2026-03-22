# -*- coding: utf-8 -*-
"""Student and group points tests."""
import pytest


def create_score_item(test_client, auth_token, class_id, *, name, score_type="plus", score_value=2, target_type="student"):
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


class TestStudentPoints:
    """Test student points management."""

    @pytest.fixture
    def setup_class(self, test_client, auth_token):
        """Setup class and student for tests."""
        class_resp = test_client.post("/api/classes/", json={"name": "Test Class", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        student_resp = test_client.post(f"/api/classes/{class_id}/students",
                                        json={"name": "Test Student", "student_no": "001"},
                                        headers={"Authorization": f"Bearer {auth_token}"})
        return class_id, student_resp.json()["id"]

    def test_add_points_to_student(self, test_client, auth_token, setup_class):
        """Test adding points to a student."""
        class_id, student_id = setup_class
        item = create_score_item(test_client, auth_token, class_id, name="Good homework", score_value=10)
        response = test_client.post(f"/api/students/{student_id}/score",
                                    json={"score_item_id": item["id"], "remark": "Good homework"},
                                    headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 201
        data = response.json()
        assert data["score_delta"] == 10
        assert data["score_item_id"] == item["id"]

    def test_deduct_points_from_student(self, test_client, auth_token, setup_class):
        """Test deducting points from a student."""
        class_id, student_id = setup_class
        plus_item = create_score_item(test_client, auth_token, class_id, name="Bonus", score_value=10)
        minus_item = create_score_item(test_client, auth_token, class_id, name="Late assignment", score_type="minus", score_value=5)
        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": plus_item["id"], "remark": "Bonus"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        response = test_client.post(f"/api/students/{student_id}/score",
                                    json={"score_item_id": minus_item["id"], "remark": "Late assignment"},
                                    headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 201
        assert response.json()["score_delta"] == -5

    def test_get_student_points_history(self, test_client, auth_token, setup_class):
        """Test getting student points history."""
        class_id, student_id = setup_class
        item1 = create_score_item(test_client, auth_token, class_id, name="Test1", score_value=5)
        item2 = create_score_item(test_client, auth_token, class_id, name="Test2", score_value=3)
        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": item1["id"], "remark": "Test1"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": item2["id"], "remark": "Test2"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        response = test_client.get(f"/api/students/{student_id}/score-logs",
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        assert len(response.json()) >= 2


class TestGroupPoints:
    """Test group points management."""

    @pytest.fixture
    def setup_group(self, test_client, auth_token):
        """Setup class and group for tests."""
        class_resp = test_client.post("/api/classes/", json={"name": "Group Class", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        group_resp = test_client.post(f"/api/classes/{class_id}/groups",
                                      json={"name": "Group A"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        return class_id, group_resp.json()["id"]

    def test_add_points_to_group(self, test_client, auth_token, setup_group):
        """Test adding points to a group."""
        class_id, group_id = setup_group
        item = create_score_item(
            test_client,
            auth_token,
            class_id,
            name="Group project",
            score_value=20,
            target_type="group",
        )
        response = test_client.post(f"/api/groups/{group_id}/score",
                                   json={"score_item_id": item["id"], "remark": "Group project"},
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 201
        assert response.json()["score_delta"] == 20

    def test_group_points_independent_from_student(self, test_client, auth_token):
        """Test group points are independent from student points."""
        # Create class and student
        class_resp = test_client.post("/api/classes/", json={"name": "Independent Class", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        group_resp = test_client.post(f"/api/classes/{class_id}/groups", json={"name": "Team 1"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        group_id = group_resp.json()["id"]
        student_resp = test_client.post(f"/api/classes/{class_id}/students", json={"name": "Student 1", "student_no": "S001"},
                                       headers={"Authorization": f"Bearer {auth_token}"})
        student_id = student_resp.json()["id"]
        student_item = create_score_item(test_client, auth_token, class_id, name="Individual", score_value=10)
        group_item = create_score_item(test_client, auth_token, class_id, name="Team", score_value=50, target_type="group")

        # Add points separately
        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": student_item["id"], "remark": "Individual"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        test_client.post(
            f"/api/groups/{group_id}/score",
            json={"score_item_id": group_item["id"], "remark": "Team"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        # Verify independent - check score logs
        student_logs = test_client.get(f"/api/students/{student_id}/score-logs",
                                       headers={"Authorization": f"Bearer {auth_token}"})
        group_logs = test_client.get(f"/api/groups/{group_id}/score-logs",
                                    headers={"Authorization": f"Bearer {auth_token}"})

        student_total = sum(log["score_delta"] for log in student_logs.json())
        group_total = sum(log["score_delta"] for log in group_logs.json())

        assert student_total == 10
        assert group_total == 50


class TestScoringEdgeCases:
    """Test edge cases for scoring operations."""

    def test_score_item_uses_server_configured_value(self, test_client, auth_token):
        """Score items should ignore client-supplied deltas and use the configured value."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Score Item Guard", "grade": "1", "school_year": "2024"},
            headers=headers
        )
        class_id = class_resp.json()["id"]

        student_resp = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "Student 1", "student_no": "S001"},
            headers=headers
        )
        student_id = student_resp.json()["id"]

        item_resp = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={"name": "固定加分", "target_type": "student", "score_type": "plus", "score_value": 2},
            headers=headers
        )
        item_id = item_resp.json()["id"]

        response = test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_delta": 999, "score_item_id": item_id},
            headers=headers
        )

        assert response.status_code == 201
        assert response.json()["score_delta"] == 2

    def test_score_non_existent_student(self, test_client, auth_token):
        """Test scoring a non-existent student returns 404."""
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Missing Student Class", "grade": "1", "school_year": "2024"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        class_id = class_resp.json()["id"]
        item = create_score_item(test_client, auth_token, class_id, name="Missing Student Item", score_value=10)
        response = test_client.post("/api/students/99999/score",
                                    json={"score_item_id": item["id"]},
                                    headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 404

    def test_score_non_existent_group(self, test_client, auth_token):
        """Test scoring a non-existent group returns 404."""
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Missing Group Class", "grade": "1", "school_year": "2024"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        class_id = class_resp.json()["id"]
        item = create_score_item(
            test_client, auth_token, class_id, name="Missing Group Item", score_value=20, target_type="group"
        )
        response = test_client.post("/api/groups/99999/score",
                                   json={"score_item_id": item["id"]},
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 404

    def test_get_score_logs_non_existent_student(self, test_client, auth_token):
        """Test getting score logs for non-existent student returns 404."""
        response = test_client.get("/api/students/99999/score-logs",
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 404

    def test_get_score_logs_non_existent_group(self, test_client, auth_token):
        """Test getting score logs for non-existent group returns 404."""
        response = test_client.get("/api/groups/99999/score-logs",
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 404


class TestClassScoreHistory:
    """Test merged class score history endpoint."""

    def test_class_score_history_merges_student_and_group_logs(self, test_client, auth_token):
        headers = {"Authorization": f"Bearer {auth_token}"}
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "History Class", "grade": "1", "school_year": "2024"},
            headers=headers
        )
        class_id = class_resp.json()["id"]

        student_resp = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "Student 1", "student_no": "S001"},
            headers=headers
        )
        student_id = student_resp.json()["id"]

        group_resp = test_client.post(
            f"/api/classes/{class_id}/groups",
            json={"name": "Group A"},
            headers=headers
        )
        group_id = group_resp.json()["id"]
        student_item = create_score_item(test_client, auth_token, class_id, name="Individual", score_value=10)
        group_item = create_score_item(
            test_client,
            auth_token,
            class_id,
            name="Reminder",
            score_type="minus",
            score_value=2,
            target_type="group",
        )

        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": student_item["id"], "remark": "Individual"},
            headers=headers
        )
        test_client.post(
            f"/api/groups/{group_id}/score",
            json={"score_item_id": group_item["id"], "remark": "Reminder"},
            headers=headers
        )

        response = test_client.get(
            f"/api/classes/{class_id}/score-history",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert {item["type"] for item in data} == {"student", "group"}
        group_log = next(item for item in data if item["type"] == "group")
        student_log = next(item for item in data if item["type"] == "student")
        assert group_log["group_name"] == "Group A"
        assert group_log["score_type"] == "minus"
        assert student_log["student_name"] == "Student 1"
