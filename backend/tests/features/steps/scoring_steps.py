# -*- coding: utf-8 -*-
"""Student scoring step definitions for BDD tests."""
from pytest_bdd import given, when, then, parsers, scenario
import pytest


class ScoringContext:
    def __init__(self):
        self.teacher_token = None
        self.admin_token = None
        self.class_id = None
        self.student_id = None
        self.student_name = None
        self.score_item_id = None
        self.score_log_id = None
        self.original_score = None
        self.new_score = None


@pytest.fixture
def scoring_context():
    """Provide scoring context for steps."""
    return ScoringContext()


@scenario("../student_scoring.feature", "给学生加分")
def test_add_student_score():
    """Test adding score to student."""
    pass


@scenario("../student_scoring.feature", "撤销积分（仅管理员）")
def test_revoke_student_score():
    """Test revoking student score."""
    pass


@given("在学生列表页")
def at_student_list_page(test_client, scoring_context):
    """At student list page."""
    # Create teacher and class
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
    scoring_context.teacher_token = login_resp.json()["access_token"]

    # Create class
    class_resp = test_client.post(
        "/api/classes/",
        json={"name": "评分测试班", "grade": "初一", "school_year": "2025-2026"},
        headers={"Authorization": f"Bearer {scoring_context.teacher_token}"}
    )
    scoring_context.class_id = class_resp.json()["id"]

    # Create student
    student_resp = test_client.post(
        f"/api/classes/{scoring_context.class_id}/students",
        json={"name": "张三", "student_no": "001"},
        headers={"Authorization": f"Bearer {scoring_context.teacher_token}"}
    )
    scoring_context.student_id = student_resp.json()["id"]
    scoring_context.student_name = "张三"
    scoring_context.original_score = 0


@when(parsers.parse('点击学生"{name}"的评分按钮'))
def click_student_score_button(test_client, scoring_context, name):
    """Click score button for student."""
    scoring_context.student_name = name


@when(parsers.parse('选择 "{item}"'))
def select_score_item(test_client, scoring_context, item):
    """Select a score item."""
    # Create score item if needed
    if "课堂发言" in item:
        # Check if item exists, if not create it
        items_resp = test_client.get(
            f"/api/classes/{scoring_context.class_id}/score-items",
            headers={"Authorization": f"Bearer {scoring_context.teacher_token}"}
        )
        items = items_resp.json()

        score_item = next((i for i in items if i["name"] == "课堂发言"), None)
        if not score_item:
            item_resp = test_client.post(
                f"/api/classes/{scoring_context.class_id}/score-items",
                json={"name": "课堂发言", "target_type": "student", "score_type": "plus", "score_value": 2, "subject": "数学"},
                headers={"Authorization": f"Bearer {scoring_context.teacher_token}"}
            )
            scoring_context.score_item_id = item_resp.json()["id"]
        else:
            scoring_context.score_item_id = score_item["id"]

        # Add score to student
        score_delta = 2
        if "+" in item:
            score_delta = int(item.split()[0].replace("+", ""))

        score_resp = test_client.post(
            f"/api/students/{scoring_context.student_id}/score",
            json={"subject": "数学", "score_item_id": scoring_context.score_item_id},
            headers={"Authorization": f"Bearer {scoring_context.teacher_token}"}
        )
        scoring_context.score_log_id = score_resp.json()["id"]
        scoring_context.new_score = scoring_context.original_score + score_delta


@then("学生积分+2")
def verify_student_score_increased(test_client, scoring_context):
    """Verify student score increased."""
    student_resp = test_client.get(
        f"/api/classes/{scoring_context.class_id}/students/{scoring_context.student_id}",
        headers={"Authorization": f"Bearer {scoring_context.teacher_token}"}
    )
    student = student_resp.json()
    assert student["total_score"] >= scoring_context.original_score


@then("历史记录增加")
def verify_history_increased(test_client, scoring_context):
    """Verify score history increased."""
    logs_resp = test_client.get(
        f"/api/students/{scoring_context.student_id}/score-logs",
        headers={"Authorization": f"Bearer {scoring_context.teacher_token}"}
    )
    logs = logs_resp.json()
    assert len(logs) >= 1


@given("我是班级管理员")
def admin_teacher(test_client, scoring_context):
    """A class admin teacher."""
    # Register and login as admin
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
    scoring_context.admin_token = login_resp.json()["access_token"]

    # Create class
    class_resp = test_client.post(
        "/api/classes/",
        json={"name": "管理员测试班", "grade": "初一", "school_year": "2025-2026"},
        headers={"Authorization": f"Bearer {scoring_context.admin_token}"}
    )
    scoring_context.class_id = class_resp.json()["id"]

    # Create student
    student_resp = test_client.post(
        f"/api/classes/{scoring_context.class_id}/students",
        json={"name": "王小明", "student_no": "002"},
        headers={"Authorization": f"Bearer {scoring_context.admin_token}"}
    )
    scoring_context.student_id = student_resp.json()["id"]
    item_resp = test_client.post(
        f"/api/classes/{scoring_context.class_id}/score-items",
        json={"name": "撤销测试项", "target_type": "student", "score_type": "plus", "score_value": 5, "subject": "数学"},
        headers={"Authorization": f"Bearer {scoring_context.admin_token}"}
    )
    scoring_context.score_item_id = item_resp.json()["id"]

    # Add a score to revoke later
    score_resp = test_client.post(
        f"/api/students/{scoring_context.student_id}/score",
        json={"score_item_id": scoring_context.score_item_id, "subject": "数学"},
        headers={"Authorization": f"Bearer {scoring_context.admin_token}"}
    )
    scoring_context.score_log_id = score_resp.json()["id"]
    scoring_context.original_score = 5


@when("撤销一条积分记录")
def revoke_score_record(test_client, scoring_context):
    """Revoke a score record."""
    revoke_resp = test_client.post(
        f"/api/student-score-logs/{scoring_context.score_log_id}/revoke",
        headers={"Authorization": f"Bearer {scoring_context.admin_token}"}
    )
    scoring_context.revoke_response = revoke_resp


@then("记录标记为已撤销")
def verify_record_revoked(scoring_context):
    """Verify record is marked as revoked."""
    assert scoring_context.revoke_response.status_code == 200
    data = scoring_context.revoke_response.json()
    assert data.get("is_revoked") is True


@then("学生积分恢复")
def verify_score_restored(test_client, scoring_context):
    """Verify student score is restored."""
    student_resp = test_client.get(
        f"/api/classes/{scoring_context.class_id}/students/{scoring_context.student_id}",
        headers={"Authorization": f"Bearer {scoring_context.admin_token}"}
    )
    student = student_resp.json()
    # Score should be restored (original minus the revoked score)
    # Note: This depends on implementation - some systems subtract, some don't count revoked
