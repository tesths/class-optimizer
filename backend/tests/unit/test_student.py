# -*- coding: utf-8 -*-
"""Student module tests."""
import pytest
from app.models import GroupMember


class TestStudentCreate:
    """Test student creation."""

    def test_create_student_success(self, test_client, auth_token):
        """Test creating a student with name, student_no, gender."""
        # Create class first
        class_response = test_client.post("/api/classes", json={
            "name": "Test Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        assert class_response.status_code == 201
        class_id = class_response.json()["id"]

        # Create student
        response = test_client.post(
            f"/api/classes/{class_id}/students",
            json={
                "name": "张三",
                "student_no": "2025001",
                "gender": "男"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "张三"
        assert data["student_no"] == "2025001"
        assert data["gender"] == "男"
        assert data["class_id"] == class_id

    def test_create_student_duplicate_student_no(self, test_client, auth_token):
        """Test creating student with duplicate student_no returns 400."""
        # Create class first
        class_response = test_client.post("/api/classes", json={
            "name": "Test Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_response.json()["id"]

        # Create first student
        test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "2025001", "gender": "男"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # Try to create duplicate
        response = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "李四", "student_no": "2025001", "gender": "女"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400
        detail = response.json()["detail"].lower()
        assert "学号" in detail or "student_no" in detail

    def test_create_student_with_group_id_syncs_group_membership(self, test_client, auth_token, db_session):
        """Test creating a student with group_id also creates group membership."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        class_response = test_client.post("/api/classes", json={
            "name": "Group Sync Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers=headers)
        class_id = class_response.json()["id"]

        group_response = test_client.post(
            f"/api/classes/{class_id}/groups",
            json={"name": "第一组"},
            headers=headers
        )
        group_id = group_response.json()["id"]

        response = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "2025001", "group_id": group_id},
            headers=headers
        )
        assert response.status_code == 201
        student_id = response.json()["id"]

        membership = db_session.query(GroupMember).filter(GroupMember.student_id == student_id).first()
        assert membership is not None
        assert membership.group_id == group_id

    def test_create_student_rejects_cross_class_group_id(self, test_client, auth_token):
        """Test creating a student cannot assign a group from another class."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        class_a = test_client.post("/api/classes", json={
            "name": "Class A",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers=headers)
        class_b = test_client.post("/api/classes", json={
            "name": "Class B",
            "grade": "初一",
            "school_year": "2026-2027"
        }, headers=headers)
        class_a_id = class_a.json()["id"]
        class_b_id = class_b.json()["id"]

        group_response = test_client.post(
            f"/api/classes/{class_b_id}/groups",
            json={"name": "B组"},
            headers=headers
        )
        group_id = group_response.json()["id"]

        response = test_client.post(
            f"/api/classes/{class_a_id}/students",
            json={"name": "张三", "student_no": "2025001", "group_id": group_id},
            headers=headers
        )
        assert response.status_code == 400
        assert "小组" in response.json()["detail"]


class TestStudentList:
    """Test student listing."""

    def test_list_students(self, test_client, auth_token):
        """Test listing students returns a list."""
        # Create class first
        class_response = test_client.post("/api/classes", json={
            "name": "Test Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_response.json()["id"]

        # Create students
        test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "2025001", "gender": "男"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "李四", "student_no": "2025002", "gender": "女"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # List students
        response = test_client.get(
            f"/api/classes/{class_id}/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2


class TestStudentDetail:
    """Test student detail retrieval."""

    def test_get_student_detail(self, test_client, auth_token):
        """Test getting a single student detail."""
        # Create class first
        class_response = test_client.post("/api/classes", json={
            "name": "Test Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_response.json()["id"]

        # Create student
        create_response = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "2025001", "gender": "男"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        student_id = create_response.json()["id"]

        # Get student detail
        response = test_client.get(
            f"/api/classes/{class_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == student_id
        assert data["name"] == "张三"
        assert data["student_no"] == "2025001"


class TestStudentUpdate:
    """Test student update."""

    def test_update_student(self, test_client, auth_token):
        """Test updating student name and group_id."""
        # Create class first
        class_response = test_client.post("/api/classes", json={
            "name": "Test Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_response.json()["id"]

        # Create student
        create_response = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "2025001", "gender": "男"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        student_id = create_response.json()["id"]

        # Update student
        response = test_client.put(
            f"/api/classes/{class_id}/students/{student_id}",
            json={"name": "张更新"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "张更新"

    def test_update_student_group_id_syncs_group_membership(self, test_client, auth_token, db_session):
        """Test updating student's group_id also updates group_members."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        class_response = test_client.post("/api/classes", json={
            "name": "Update Group Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers=headers)
        class_id = class_response.json()["id"]

        group_a = test_client.post(
            f"/api/classes/{class_id}/groups",
            json={"name": "A组"},
            headers=headers
        ).json()["id"]
        group_b = test_client.post(
            f"/api/classes/{class_id}/groups",
            json={"name": "B组"},
            headers=headers
        ).json()["id"]

        create_response = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "2025001", "group_id": group_a},
            headers=headers
        )
        student_id = create_response.json()["id"]

        response = test_client.put(
            f"/api/classes/{class_id}/students/{student_id}",
            json={"group_id": group_b},
            headers=headers
        )
        assert response.status_code == 200
        assert response.json()["group_id"] == group_b

        membership = db_session.query(GroupMember).filter(GroupMember.student_id == student_id).first()
        assert membership is not None
        assert membership.group_id == group_b

    def test_update_student_duplicate_student_no_returns_400(self, test_client, auth_token):
        """Test updating student_no to an existing one returns 400 instead of 500."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        class_response = test_client.post("/api/classes", json={
            "name": "Duplicate Update Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers=headers)
        class_id = class_response.json()["id"]

        first = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "2025001"},
            headers=headers
        )
        second = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "李四", "student_no": "2025002"},
            headers=headers
        )

        response = test_client.put(
            f"/api/classes/{class_id}/students/{second.json()['id']}",
            json={"student_no": first.json()["student_no"]},
            headers=headers
        )
        assert response.status_code == 400
        assert "学号" in response.json()["detail"]


class TestStudentDelete:
    """Test student deletion."""

    def test_delete_student(self, test_client, auth_token):
        """Test deleting a student."""
        # Create class first
        class_response = test_client.post("/api/classes", json={
            "name": "Test Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_response.json()["id"]

        # Create student
        create_response = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "2025001", "gender": "男"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        student_id = create_response.json()["id"]

        # Delete student
        response = test_client.delete(
            f"/api/classes/{class_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 204

        # Verify student is deleted
        get_response = test_client.get(
            f"/api/classes/{class_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 404


class TestStudentClassRelationship:
    """Test student-class relationship."""

    def test_student_belongs_to_class(self, test_client, auth_token):
        """Test that student.class_id matches the class."""
        # Create class first
        class_response = test_client.post("/api/classes", json={
            "name": "Test Class",
            "grade": "初一",
            "school_year": "2025-2026"
        }, headers={"Authorization": f"Bearer {auth_token}"})
        class_id = class_response.json()["id"]

        # Create student
        create_response = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "2025001", "gender": "男"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = create_response.json()

        # Verify student.class_id matches
        assert data["class_id"] == class_id

        # List students and verify
        list_response = test_client.get(
            f"/api/classes/{class_id}/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        students = list_response.json()
        assert all(s["class_id"] == class_id for s in students)
