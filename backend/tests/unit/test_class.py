# -*- coding: utf-8 -*-
"""Class management module tests."""
import pytest
from app.models import (
    Class,
    ClassTeacher,
    GroupMember,
    GroupScoreLog,
    ScoreItem,
    Student,
    StudentGroup,
    StudentScoreLog,
)
from app.utils.growth import DEFAULT_GROUP_GROWTH_THRESHOLDS


class TestClassCRUD:
    """Test class CRUD operations."""

    def test_create_class(self, test_client, auth_token):
        """Test creating a new class."""
        response = test_client.post(
            "/api/classes/",
            json={"name": "Class 1-A", "grade": "1", "school_year": "2024"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Class 1-A"
        assert data["grade"] == "1"
        assert data["group_growth_thresholds"] == DEFAULT_GROUP_GROWTH_THRESHOLDS

    def test_list_classes(self, test_client, auth_token):
        """Test listing all classes."""
        test_client.post("/api/classes/", json={"name": "Class 1-B", "grade": "1", "school_year": "2024"},
                        headers={"Authorization": f"Bearer {auth_token}"})
        test_client.post("/api/classes/", json={"name": "Class 2-A", "grade": "2", "school_year": "2024"},
                        headers={"Authorization": f"Bearer {auth_token}"})
        response = test_client.get("/api/classes/", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

    def test_get_class_by_id(self, test_client, auth_token):
        """Test getting a specific class."""
        create_resp = test_client.post("/api/classes/", json={"name": "Class 3-A", "grade": "3", "school_year": "2024"},
                                       headers={"Authorization": f"Bearer {auth_token}"})
        class_id = create_resp.json()["id"]
        response = test_client.get(f"/api/classes/{class_id}", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        assert response.json()["name"] == "Class 3-A"

    def test_update_class(self, test_client, auth_token):
        """Test updating a class."""
        create_resp = test_client.post("/api/classes/", json={"name": "Old Name", "grade": "1", "school_year": "2024"},
                                       headers={"Authorization": f"Bearer {auth_token}"})
        class_id = create_resp.json()["id"]
        response = test_client.put(
            f"/api/classes/{class_id}",
            json={"name": "New Name", "group_growth_thresholds": [0, 30, 60, 100, 160]},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"
        assert response.json()["group_growth_thresholds"] == [0, 30, 60, 100, 160]

    def test_update_class_rejects_invalid_group_growth_thresholds(self, test_client, auth_token):
        """Test invalid group growth thresholds are rejected."""
        create_resp = test_client.post(
            "/api/classes/",
            json={"name": "Threshold Class", "grade": "1", "school_year": "2024"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        class_id = create_resp.json()["id"]
        response = test_client.put(
            f"/api/classes/{class_id}",
            json={"group_growth_thresholds": [10, 20, 30, 40, 50]},
                                    headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 422

    def test_delete_class(self, test_client, auth_token):
        """Test deleting a class."""
        create_resp = test_client.post("/api/classes/", json={"name": "To Delete", "grade": "1", "school_year": "2024"},
                                       headers={"Authorization": f"Bearer {auth_token}"})
        class_id = create_resp.json()["id"]
        response = test_client.delete(f"/api/classes/{class_id}", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 204

    def test_duplicate_class_returns_400(self, test_client, auth_token):
        """Test duplicate class name/school year is surfaced as 400."""
        payload = {"name": "重复班级", "grade": "1", "school_year": "2024"}
        first = test_client.post(
            "/api/classes/",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        second = test_client.post(
            "/api/classes/",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert first.status_code == 201
        assert second.status_code == 400
        assert "已存在" in second.json()["detail"]

    def test_delete_class_removes_related_records(self, test_client, auth_token, db_session):
        """Test deleting a class removes related rows instead of leaving orphans."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Cascade Delete", "grade": "1", "school_year": "2024"},
            headers=headers
        )
        class_id = class_resp.json()["id"]

        group_resp = test_client.post(
            f"/api/classes/{class_id}/groups",
            json={"name": "A组"},
            headers=headers
        )
        group_id = group_resp.json()["id"]

        student_resp = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "001", "group_id": group_id},
            headers=headers
        )
        student_id = student_resp.json()["id"]

        score_item_resp = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={"name": "课堂表现", "target_type": "student", "score_type": "plus", "score_value": 2},
            headers=headers
        )
        score_item_id = score_item_resp.json()["id"]
        group_score_item_resp = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={"name": "小组协作", "target_type": "group", "score_type": "plus", "score_value": 3},
            headers=headers
        )
        group_score_item_id = group_score_item_resp.json()["id"]

        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_delta": 2, "score_item_id": score_item_id},
            headers=headers
        )
        test_client.post(
            f"/api/groups/{group_id}/score",
            json={"score_item_id": group_score_item_id},
            headers=headers
        )

        delete_resp = test_client.delete(f"/api/classes/{class_id}", headers=headers)
        assert delete_resp.status_code == 204

        students_resp = test_client.get(f"/api/classes/{class_id}/students", headers=headers)
        assert students_resp.status_code == 403

        assert db_session.query(Class).filter(Class.id == class_id).count() == 0
        assert db_session.query(ClassTeacher).filter(ClassTeacher.class_id == class_id).count() == 0
        assert db_session.query(Student).filter(Student.class_id == class_id).count() == 0
        assert db_session.query(StudentGroup).filter(StudentGroup.class_id == class_id).count() == 0
        assert db_session.query(GroupMember).count() == 0
        assert db_session.query(ScoreItem).filter(ScoreItem.class_id == class_id).count() == 0
        assert db_session.query(StudentScoreLog).filter(StudentScoreLog.class_id == class_id).count() == 0
        assert db_session.query(GroupScoreLog).filter(GroupScoreLog.class_id == class_id).count() == 0


class TestClassPermissions:
    """Test class permission checks."""

    def test_other_teacher_cannot_access_class(self, test_client):
        """Test that other teachers cannot access my class."""
        # Teacher 1 creates class
        test_client.post("/api/auth/register", json={
            "username": "teacher1", "password": "password1", "confirm_password": "password1", "real_name": "T1", "subject": "Math"
        })
        login1 = test_client.post("/api/auth/login", data={"username": "teacher1", "password": "password1"})
        token1 = login1.json()["access_token"]

        class_resp = test_client.post("/api/classes/", json={"name": "T1 Class", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {token1}"})

        # Teacher 2 tries to access
        test_client.post("/api/auth/register", json={
            "username": "teacher2", "password": "password2", "confirm_password": "password2", "real_name": "T2", "subject": "English"
        })
        login2 = test_client.post("/api/auth/login", data={"username": "teacher2", "password": "password2"})
        token2 = login2.json()["access_token"]

        class_id = class_resp.json()["id"]
        response = test_client.get(f"/api/classes/{class_id}", headers={"Authorization": f"Bearer {token2}"})
        assert response.status_code in [403, 404]

    def test_admin_can_add_teacher(self, test_client, auth_token):
        """Test admin can add another teacher to class."""
        # Create class
        class_resp = test_client.post("/api/classes/", json={"name": "Add Teacher Test", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]

        # Register another teacher
        test_client.post("/api/auth/register", json={
            "username": "newteacher", "password": "pass123", "confirm_password": "pass123", "real_name": "New T", "subject": "Science"
        })

        # Add teacher to class
        response = test_client.post(f"/api/classes/{class_id}/teachers",
                                    json={"username": "newteacher", "role": "class_teacher"},
                                    headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 201


class TestGroupManagement:
    """Test group management operations."""

    def test_create_group(self, test_client, auth_token):
        """Test creating a new group."""
        class_resp = test_client.post("/api/classes/", json={"name": "Group Class", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        response = test_client.post(f"/api/classes/{class_id}/groups",
                                   json={"name": "Group One"},
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 201
        assert response.json()["name"] == "Group One"

    def test_list_groups(self, test_client, auth_token):
        """Test listing groups in a class."""
        class_resp = test_client.post("/api/classes/", json={"name": "List Groups", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        test_client.post(f"/api/classes/{class_id}/groups", json={"name": "Group A"},
                        headers={"Authorization": f"Bearer {auth_token}"})
        test_client.post(f"/api/classes/{class_id}/groups", json={"name": "Group B"},
                        headers={"Authorization": f"Bearer {auth_token}"})

        response = test_client.get(f"/api/classes/{class_id}/groups",
                                  headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        assert len(response.json()) >= 2

    def test_update_group(self, test_client, auth_token):
        """Test updating a group."""
        class_resp = test_client.post("/api/classes/", json={"name": "Update Group", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        group_resp = test_client.post(f"/api/classes/{class_id}/groups", json={"name": "Old Name"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        group_id = group_resp.json()["id"]

        response = test_client.put(f"/api/classes/{class_id}/groups/{group_id}",
                                  json={"name": "New Name"},
                                  headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"

    def test_delete_group(self, test_client, auth_token):
        """Test deleting a group."""
        class_resp = test_client.post("/api/classes/", json={"name": "Delete Group", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        group_resp = test_client.post(f"/api/classes/{class_id}/groups", json={"name": "To Delete"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        group_id = group_resp.json()["id"]

        response = test_client.delete(f"/api/classes/{class_id}/groups/{group_id}",
                                     headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 204

    def test_student_without_group(self, test_client, auth_token):
        """Test student can exist without a group."""
        class_resp = test_client.post("/api/classes/", json={"name": "No Group Class", "grade": "1", "school_year": "2024"},
                                      headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_resp.json()["id"]
        student_resp = test_client.post(f"/api/classes/{class_id}/students",
                                        json={"name": "No Group Student", "student_no": "NG001"},
                                        headers={"Authorization": f"Bearer {auth_token}"})
        assert student_resp.status_code == 201
        assert student_resp.json()["group_id"] is None
