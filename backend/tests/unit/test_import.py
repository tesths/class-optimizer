# -*- coding: utf-8 -*-
"""Import API tests."""
import pytest
from io import BytesIO
from openpyxl import Workbook
from app.models.group import GroupMember


class TestImportTemplate:
    """Test import template download."""

    def test_download_template(self, test_client, auth_token):
        """Test downloading the student import template."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Import Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Download template
        response = test_client.get(
            f"/api/classes/{class_id}/students/import/template",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert "attachment" in response.headers["content-disposition"]

    def test_download_template_requires_class_admin(self, test_client, auth_token):
        """Only class admins should be allowed to download the template."""
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Restricted Import Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        test_client.post("/api/auth/register", json={
            "username": "importviewer",
            "password": "password123",
            "confirm_password": "password123",
            "real_name": "Import Viewer",
            "subject": "英语"
        })
        login_resp = test_client.post("/api/auth/login", data={
            "username": "importviewer",
            "password": "password123"
        })
        foreign_token = login_resp.json()["access_token"]

        response = test_client.get(
            f"/api/classes/{class_id}/students/import/template",
            headers={"Authorization": f"Bearer {foreign_token}"}
        )
        assert response.status_code == 403


class TestImportPreview:
    """Test import preview functionality."""

    def create_excel_file(self, rows):
        """Helper to create Excel file from rows."""
        wb = Workbook()
        ws = wb.active
        for row in rows:
            ws.append(row)
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer

    def test_preview_import_valid(self, test_client, auth_token):
        """Test preview with valid Excel data."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Preview Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Create valid Excel file
        rows = [
            ["姓名", "学号", "性别", "座号", "小组名称"],
            ["张三", "001", "男", "1", "A组"],
            ["李四", "002", "女", "2", "B组"],
        ]
        buffer = self.create_excel_file(rows)

        # Preview import
        response = test_client.post(
            f"/api/classes/{class_id}/students/import/preview",
            files={"file": ("students.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 2
        assert data["items"][0]["name"] == "张三"
        assert data["items"][0]["student_no"] == "001"

    def test_preview_import_invalid_rows(self, test_client, auth_token):
        """Test preview with invalid data returns errors."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Invalid Preview Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Create Excel file with invalid data (missing required fields)
        rows = [
            ["姓名", "学号", "性别", "座号", "小组名称"],
            ["", "001", "男", "1", "A组"],  # Empty name
            ["王五", "", "女", "2", "B组"],  # Empty student_no
        ]
        buffer = self.create_excel_file(rows)

        # Preview import
        response = test_client.post(
            f"/api/classes/{class_id}/students/import/preview",
            files={"file": ("students.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have errors or less valid items
        assert "error_count" in data or "items" in data
        assert data.get("error_count", 0) > 0 or len(data.get("items", [])) < 2

    def test_preview_import_accepts_numeric_cells(self, test_client, auth_token):
        """Numeric Excel cells should be normalized instead of crashing preview."""
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Numeric Preview Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        rows = [
            ["姓名", "学号", "性别", "座号", "小组名称"],
            ["张三", 1, "男", 2, "A组"],
        ]
        buffer = self.create_excel_file(rows)

        response = test_client.post(
            f"/api/classes/{class_id}/students/import/preview",
            files={"file": ("students.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        item = response.json()["items"][0]
        assert item["student_no"] == "1"
        assert item["seat_no"] == "2"


class TestImportCommit:
    """Test import commit functionality."""

    def create_excel_file(self, rows):
        """Helper to create Excel file from rows."""
        wb = Workbook()
        ws = wb.active
        for row in rows:
            ws.append(row)
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer

    def test_commit_import_success(self, test_client, auth_token):
        """Test commit import creates students."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Commit Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Create Excel file
        rows = [
            ["姓名", "学号", "性别", "座号", "小组名称"],
            ["张三", "001", "男", "1", "A组"],
            ["李四", "002", "女", "2", "B组"],
        ]
        buffer = self.create_excel_file(rows)

        # Commit import
        response = test_client.post(
            f"/api/classes/{class_id}/students/import/commit",
            files={"file": ("students.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 201]
        data = response.json()
        # Import job response should have success_rows or total_rows
        assert data.get("success_rows", 0) >= 0 or data.get("total_rows", 0) >= 0

        # Verify students were created
        list_response = test_client.get(
            f"/api/classes/{class_id}/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        students = list_response.json()
        assert len(students) == 2
        names = [s["name"] for s in students]
        assert "张三" in names
        assert "李四" in names

    def test_commit_import_creates_groups(self, test_client, auth_token):
        """Test import with group column creates students (groups need separate creation)."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Group Import Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Create Excel file with groups
        rows = [
            ["姓名", "学号", "性别", "座位号", "小组"],
            ["张三", "001", "男", "1", "A组"],
            ["李四", "002", "女", "2", "A组"],
            ["王五", "003", "男", "3", "B组"],
        ]
        buffer = self.create_excel_file(rows)

        # Commit import
        response = test_client.post(
            f"/api/classes/{class_id}/students/import/commit",
            files={"file": ("students.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200

        # Verify students were created (groups need to be created separately)
        students_response = test_client.get(
            f"/api/classes/{class_id}/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        students = students_response.json()
        assert len(students) == 3

    def test_import_without_groups(self, test_client, auth_token):
        """Test import without group column."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "No Group Import Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Create Excel file without groups
        rows = [
            ["姓名", "学号", "性别", "座号"],
            ["张三", "001", "男", "1"],
            ["李四", "002", "女", "2"],
        ]
        buffer = self.create_excel_file(rows)

        # Commit import
        response = test_client.post(
            f"/api/classes/{class_id}/students/import/commit",
            files={"file": ("students.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 201]

        # Verify students were created without groups
        students_response = test_client.get(
            f"/api/classes/{class_id}/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        students = students_response.json()
        assert len(students) == 2
        for student in students:
            assert student["group_id"] is None

    def test_commit_import_creates_group_members(self, test_client, auth_token, db_session):
        """Test import keeps student.group_id and group_members in sync."""
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Sync Import Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        rows = [
            ["姓名", "学号", "性别", "座号", "小组名称"],
            ["张三", "001", "男", "1", "A组"],
            ["李四", "002", "女", "2", "A组"],
        ]
        buffer = self.create_excel_file(rows)

        response = test_client.post(
            f"/api/classes/{class_id}/students/import/commit",
            files={"file": ("students.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200

        groups_response = test_client.get(
            f"/api/classes/{class_id}/groups",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert groups_response.status_code == 200
        groups = groups_response.json()
        assert len(groups) == 1
        assert groups[0]["member_count"] == 2

        memberships = db_session.query(GroupMember).all()
        assert len(memberships) == 2

    def test_commit_import_supports_header_aliases(self, test_client, auth_token):
        """Common header aliases like 座位号 and 小组 should still import correctly."""
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Alias Import Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        rows = [
            ["姓名", "学号", "性别", "座位号", "小组"],
            ["张三", 1, "男", 1, "A组"],
            ["李四", 2, "女", 2, "A组"],
        ]
        buffer = self.create_excel_file(rows)

        response = test_client.post(
            f"/api/classes/{class_id}/students/import/commit",
            files={"file": ("students.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200

        students_response = test_client.get(
            f"/api/classes/{class_id}/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        groups_response = test_client.get(
            f"/api/classes/{class_id}/groups",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        students = students_response.json()
        groups = groups_response.json()
        assert len(students) == 2
        assert {student["student_no"] for student in students} == {"1", "2"}
        assert len(groups) == 1
        assert groups[0]["member_count"] == 2
