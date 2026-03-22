# -*- coding: utf-8 -*-
"""Extended permission regression coverage for cross-teacher access."""


def register_and_login(test_client, username: str, password: str = "password123") -> str:
    """Register a teacher and return their access token."""
    test_client.post("/api/auth/register", json={
        "username": username,
        "password": password,
        "confirm_password": password,
        "real_name": f"{username}-teacher",
        "subject": "语文"
    })
    login_resp = test_client.post("/api/auth/login", data={
        "username": username,
        "password": password
    })
    return login_resp.json()["access_token"]


def create_score_item(test_client, token: str, class_id: int, *, name: str, score_value: int, target_type: str = "student"):
    response = test_client.post(
        f"/api/classes/{class_id}/score-items",
        json={
            "name": name,
            "target_type": target_type,
            "score_type": "plus",
            "score_value": score_value,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    return response.json()


def seed_foreign_class_resources(test_client):
    """Create a class with student, group and logs owned by teacher A."""
    owner_token = register_and_login(test_client, "owner_teacher")
    foreign_token = register_and_login(test_client, "foreign_teacher")

    class_resp = test_client.post("/api/classes/", json={
        "name": "权限测试班级",
        "grade": "初一",
        "school_year": "2025-2026"
    }, headers={"Authorization": f"Bearer {owner_token}"})
    class_id = class_resp.json()["id"]

    student_resp = test_client.post(
        f"/api/classes/{class_id}/students",
        json={"name": "权限学生", "student_no": "PERM001"},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    student_id = student_resp.json()["id"]

    group_resp = test_client.post(
        f"/api/classes/{class_id}/groups",
        json={"name": "权限小组"},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    group_id = group_resp.json()["id"]
    student_item = create_score_item(test_client, owner_token, class_id, name="权限学生评分", score_value=2)
    group_item = create_score_item(test_client, owner_token, class_id, name="权限小组评分", score_value=3, target_type="group")

    score_student_resp = test_client.post(
        f"/api/students/{student_id}/score",
        json={"score_item_id": student_item["id"], "remark": "权限学生评分"},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    student_log_id = score_student_resp.json()["id"]

    score_group_resp = test_client.post(
        f"/api/groups/{group_id}/score",
        json={"score_item_id": group_item["id"]},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    group_log_id = score_group_resp.json()["id"]

    return {
        "owner_token": owner_token,
        "foreign_token": foreign_token,
        "class_id": class_id,
        "student_id": student_id,
        "group_id": group_id,
        "student_log_id": student_log_id,
        "group_log_id": group_log_id
    }


class TestExtendedPermissions:
    """Permission coverage outside the import flow."""

    def test_other_teacher_cannot_access_foreign_student_and_group_resources(self, test_client):
        """Unrelated teachers should be blocked from student and group APIs."""
        seeded = seed_foreign_class_resources(test_client)
        foreign_headers = {"Authorization": f"Bearer {seeded['foreign_token']}"}

        list_students_resp = test_client.get(f"/api/classes/{seeded['class_id']}/students", headers=foreign_headers)
        assert list_students_resp.status_code == 403

        create_student_resp = test_client.post(
            f"/api/classes/{seeded['class_id']}/students",
            json={"name": "越权学生", "student_no": "PERM999"},
            headers=foreign_headers
        )
        assert create_student_resp.status_code == 403

        list_groups_resp = test_client.get(f"/api/classes/{seeded['class_id']}/groups", headers=foreign_headers)
        assert list_groups_resp.status_code == 403

        add_member_resp = test_client.post(
            f"/api/classes/{seeded['class_id']}/groups/{seeded['group_id']}/members",
            json={"student_id": seeded["student_id"]},
            headers=foreign_headers
        )
        assert add_member_resp.status_code == 403

    def test_other_teacher_cannot_score_or_read_logs_of_foreign_entities(self, test_client):
        """Cross-teacher score and history access should be rejected."""
        seeded = seed_foreign_class_resources(test_client)
        foreign_headers = {"Authorization": f"Bearer {seeded['foreign_token']}"}

        score_student_item = create_score_item(test_client, seeded["owner_token"], seeded["class_id"], name="越权学生评分", score_value=5)
        score_student_resp = test_client.post(
            f"/api/students/{seeded['student_id']}/score",
            json={"score_item_id": score_student_item["id"]},
            headers=foreign_headers
        )
        assert score_student_resp.status_code == 403

        student_logs_resp = test_client.get(
            f"/api/students/{seeded['student_id']}/score-logs",
            headers=foreign_headers
        )
        assert student_logs_resp.status_code == 403

        score_group_item = create_score_item(
            test_client, seeded["owner_token"], seeded["class_id"], name="越权小组评分", score_value=5, target_type="group"
        )
        score_group_resp = test_client.post(
            f"/api/groups/{seeded['group_id']}/score",
            json={"score_item_id": score_group_item["id"]},
            headers=foreign_headers
        )
        assert score_group_resp.status_code == 403

        group_logs_resp = test_client.get(
            f"/api/groups/{seeded['group_id']}/score-logs",
            headers=foreign_headers
        )
        assert group_logs_resp.status_code == 403

    def test_other_teacher_cannot_access_foreign_stats_or_revoke_logs(self, test_client):
        """Foreign teachers should be blocked from stats and revoke endpoints."""
        seeded = seed_foreign_class_resources(test_client)
        foreign_headers = {"Authorization": f"Bearer {seeded['foreign_token']}"}

        overview_resp = test_client.get(
            f"/api/classes/{seeded['class_id']}/stats/overview",
            headers=foreign_headers
        )
        assert overview_resp.status_code == 403

        student_stats_resp = test_client.get(
            f"/api/classes/{seeded['class_id']}/stats/students",
            headers=foreign_headers
        )
        assert student_stats_resp.status_code == 403

        group_stats_resp = test_client.get(
            f"/api/classes/{seeded['class_id']}/stats/groups",
            headers=foreign_headers
        )
        assert group_stats_resp.status_code == 403

        revoke_student_resp = test_client.post(
            f"/api/student-score-logs/{seeded['student_log_id']}/revoke",
            headers=foreign_headers
        )
        assert revoke_student_resp.status_code == 403

        revoke_group_resp = test_client.post(
            f"/api/group-score-logs/{seeded['group_log_id']}/revoke",
            headers=foreign_headers
        )
        assert revoke_group_resp.status_code == 403
