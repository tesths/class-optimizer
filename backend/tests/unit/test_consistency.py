# -*- coding: utf-8 -*-
"""Consistency coverage for revoke and delete side effects."""


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


def create_class_student_group(test_client, auth_token, class_name: str = "一致性班级"):
    """Create a class with one student and one group."""
    class_resp = test_client.post("/api/classes/", json={
        "name": class_name,
        "grade": "初一",
        "school_year": "2025-2026"
    }, headers={"Authorization": f"Bearer {auth_token}"})
    class_id = class_resp.json()["id"]

    student_resp = test_client.post(
        f"/api/classes/{class_id}/students",
        json={"name": "一致性学生", "student_no": "CONS001"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    student_id = student_resp.json()["id"]

    group_resp = test_client.post(
        f"/api/classes/{class_id}/groups",
        json={"name": "一致性小组"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    group_id = group_resp.json()["id"]

    return class_id, student_id, group_id


class TestRevokeAndDeleteConsistency:
    """Verify score revoke/delete side effects across stats and history."""

    def test_revoked_student_score_is_excluded_from_overview_and_student_stats(self, test_client, auth_token):
        """Student revoke should keep history but remove effective totals."""
        class_id, student_id, _ = create_class_student_group(test_client, auth_token, "撤销学生一致性")
        item = create_score_item(test_client, auth_token, class_id, name="待撤销学生", score_value=5)

        score_resp = test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": item["id"], "remark": "待撤销学生"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        log_id = score_resp.json()["id"]

        revoke_resp = test_client.post(
            f"/api/student-score-logs/{log_id}/revoke",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert revoke_resp.status_code == 200

        overview_resp = test_client.get(
            f"/api/classes/{class_id}/stats/overview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        overview = overview_resp.json()
        assert overview["week_plus"] == 0
        assert overview["month_plus"] == 0

        student_stats_resp = test_client.get(
            f"/api/classes/{class_id}/stats/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        student_stats = student_stats_resp.json()
        assert student_stats[0]["total_score"] == 0
        assert student_stats[0]["plus_count"] == 0

        logs_resp = test_client.get(
            f"/api/students/{student_id}/score-logs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert logs_resp.json()[0]["is_revoked"] is True

    def test_revoked_group_score_is_excluded_from_overview_and_group_stats(self, test_client, auth_token):
        """Group revoke should keep history but remove effective totals."""
        class_id, _, group_id = create_class_student_group(test_client, auth_token, "撤销小组一致性")
        item = create_score_item(test_client, auth_token, class_id, name="待撤销小组", score_value=7, target_type="group")

        score_resp = test_client.post(
            f"/api/groups/{group_id}/score",
            json={"score_item_id": item["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        log_id = score_resp.json()["id"]

        revoke_resp = test_client.post(
            f"/api/group-score-logs/{log_id}/revoke",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert revoke_resp.status_code == 200

        overview_resp = test_client.get(
            f"/api/classes/{class_id}/stats/overview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        overview = overview_resp.json()
        assert overview["week_plus"] == 0
        assert overview["month_plus"] == 0

        group_stats_resp = test_client.get(
            f"/api/classes/{class_id}/stats/groups",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        group_stats = group_stats_resp.json()
        assert group_stats[0]["total_score"] == 0

        logs_resp = test_client.get(
            f"/api/groups/{group_id}/score-logs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert logs_resp.json()[0]["is_revoked"] is True

    def test_delete_student_removes_score_logs_and_restores_overview(self, test_client, auth_token):
        """Deleting a scored student should not leave stale totals behind."""
        class_id, student_id, _ = create_class_student_group(test_client, auth_token, "删除学生一致性")
        item = create_score_item(test_client, auth_token, class_id, name="删除前学生评分", score_value=4)

        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": item["id"], "remark": "删除前学生评分"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        delete_resp = test_client.delete(
            f"/api/classes/{class_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_resp.status_code == 204

        overview_resp = test_client.get(
            f"/api/classes/{class_id}/stats/overview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        overview = overview_resp.json()
        assert overview["student_count"] == 0
        assert overview["week_plus"] == 0

        student_stats_resp = test_client.get(
            f"/api/classes/{class_id}/stats/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert student_stats_resp.json() == []

    def test_delete_group_removes_memberships_and_group_scores(self, test_client, auth_token):
        """Deleting a scored group should clear totals and student group pointers."""
        class_id, student_id, group_id = create_class_student_group(test_client, auth_token, "删除小组一致性")
        item = create_score_item(test_client, auth_token, class_id, name="删除前小组评分", score_value=6, target_type="group")

        add_member_resp = test_client.post(
            f"/api/classes/{class_id}/groups/{group_id}/members",
            json={"student_id": student_id},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert add_member_resp.status_code == 200

        test_client.post(
            f"/api/groups/{group_id}/score",
            json={"score_item_id": item["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        delete_resp = test_client.delete(
            f"/api/classes/{class_id}/groups/{group_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_resp.status_code == 204

        overview_resp = test_client.get(
            f"/api/classes/{class_id}/stats/overview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        overview = overview_resp.json()
        assert overview["group_count"] == 0
        assert overview["week_plus"] == 0

        groups_resp = test_client.get(
            f"/api/classes/{class_id}/groups",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert groups_resp.json() == []

        students_resp = test_client.get(
            f"/api/classes/{class_id}/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert students_resp.json()[0]["group_id"] is None
