# -*- coding: utf-8 -*-
"""Class management step definitions for BDD tests."""
from pytest_bdd import given, when, then, parsers, scenario
import pytest


class ClassContext:
    def __init__(self):
        self.teacher_token = None
        self.teacher2_token = None
        self.class_id = None
        self.class_name = None
        self.grade = None
        self.school_year = None
        self.created_class_id = None


@pytest.fixture
def class_context():
    """Provide class context for steps."""
    return ClassContext()


@scenario("../class_management.feature", "创建新班级")
def test_create_class():
    """Test creating a new class."""
    pass


@scenario("../class_management.feature", "非管理员不能删除班级")
def test_non_admin_cannot_delete_class():
    """Test that non-admin cannot delete class."""
    pass


@given("已登录教师")
def logged_in_teacher(test_client, class_context):
    """A logged in teacher."""
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
    class_context.teacher_token = login_resp.json()["access_token"]


@when('点击"新建班级"')
def click_new_class():
    """Click new class button."""
    pass


@when(parsers.parse('填写 name="{name}" grade="{grade}" school_year="{school_year}"'))
def fill_class_form(test_client, class_context, name, grade, school_year):
    """Fill the class creation form."""
    class_context.class_name = name
    class_context.grade = grade
    class_context.school_year = school_year

    response = test_client.post(
        "/api/classes/",
        json={"name": name, "grade": grade, "school_year": school_year},
        headers={"Authorization": f"Bearer {class_context.teacher_token}"}
    )
    class_context.create_response = response
    if response.status_code in [200, 201]:
        class_context.created_class_id = response.json()["id"]


@then("班级出现在列表中")
def class_appears_in_list(test_client, class_context):
    """Verify class appears in class list."""
    response = test_client.get(
        "/api/classes/",
        headers={"Authorization": f"Bearer {class_context.teacher_token}"}
    )
    assert response.status_code == 200
    classes = response.json()
    class_names = [c["name"] for c in classes]
    assert class_context.class_name in class_names


@given("我是协同教师（非管理员）")
def non_admin_teacher(test_client, class_context):
    """A co-teacher without admin role."""
    # Register main teacher and create class
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

    # Create a class
    class_resp = test_client.post(
        "/api/classes/",
        json={"name": "Test Class", "grade": "初一", "school_year": "2025-2026"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    class_context.class_id = class_resp.json()["id"]

    # Add another teacher as co-teacher (non-admin)
    test_client.post("/api/auth/register", json={
        "username": "codoc",
        "password": "Pass123",
        "confirm_password": "Pass123",
        "real_name": "李老师",
        "subject": "英语"
    })

    test_client.post(
        f"/api/classes/{class_context.class_id}/teachers",
        json={"username": "codoc", "role": "class_teacher"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Login as co-teacher
    co_login = test_client.post("/api/auth/login", data={
        "username": "codoc",
        "password": "Pass123"
    })
    class_context.teacher2_token = co_login.json()["access_token"]


@when("尝试删除班级")
def try_delete_class(test_client, class_context):
    """Attempt to delete the class."""
    response = test_client.delete(
        f"/api/classes/{class_context.class_id}",
        headers={"Authorization": f"Bearer {class_context.teacher2_token}"}
    )
    class_context.delete_response = response


@then("操作被拒绝")
def operation_denied(class_context):
    """Verify operation was denied."""
    assert class_context.delete_response.status_code in [403, 404]
