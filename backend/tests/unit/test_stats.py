# -*- coding: utf-8 -*-
"""Stats API tests."""
import pytest


def create_score_item(test_client, auth_token, class_id, *, name, score_value, score_type="plus", subject=None, target_type="student"):
    response = test_client.post(
        f"/api/classes/{class_id}/score-items",
        json={
            "name": name,
            "target_type": target_type,
            "score_type": score_type,
            "score_value": score_value,
            "subject": subject,
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 201
    return response.json()


class TestStatsOverview:
    """Test stats overview endpoint."""

    def test_stats_overview_empty_class(self, test_client, auth_token):
        """Test stats overview for empty class."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Test Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Get overview
        response = test_client.get(
            f"/api/classes/{class_id}/stats/overview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["student_count"] == 0
        assert data["group_count"] == 0
        assert data["week_plus"] == 0
        assert data["week_minus"] == 0
        assert data["month_plus"] == 0
        assert data["month_minus"] == 0

    def test_stats_overview_with_students_and_scores(self, test_client, auth_token):
        """Test stats overview with students and scores."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Scoring Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Create students
        student1 = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "001", "gender": "男"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        student2 = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "李四", "student_no": "002", "gender": "女"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        student1_id = student1.json()["id"]
        student2_id = student2.json()["id"]

        # Create score items
        score_item = create_score_item(test_client, auth_token, class_id, name="课堂发言", score_value=2, subject="数学")
        bonus_item = create_score_item(test_client, auth_token, class_id, name="作业认真", score_value=3, subject="数学")
        minus_item = create_score_item(test_client, auth_token, class_id, name="课堂提醒", score_value=2, score_type="minus", subject="数学")

        # Add scores
        test_client.post(
            f"/api/students/{student1_id}/score",
            json={"score_delta": 5, "subject": "数学", "score_item_id": score_item["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/students/{student1_id}/score",
            json={"score_item_id": bonus_item["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/students/{student2_id}/score",
            json={"score_item_id": minus_item["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # Get overview
        response = test_client.get(
            f"/api/classes/{class_id}/stats/overview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["student_count"] == 2
        assert data["week_plus"] == 5
        assert data["week_minus"] == 2


class TestStudentRankings:
    """Test student rankings endpoint."""

    def test_student_rankings_empty(self, test_client, auth_token):
        """Test student rankings for empty class."""
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Ranking Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        response = test_client.get(
            f"/api/classes/{class_id}/stats/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_student_rankings_with_scores(self, test_client, auth_token):
        """Test student rankings with scores."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Rank Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Create students
        student1 = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "张三", "student_no": "001"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        student2 = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "李四", "student_no": "002"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        student1_id = student1.json()["id"]
        student2_id = student2.json()["id"]

        # Add scores
        item1 = create_score_item(test_client, auth_token, class_id, name="数学表现", score_value=10, subject="数学")
        item2 = create_score_item(test_client, auth_token, class_id, name="英语表现", score_value=5, subject="英语")
        test_client.post(
            f"/api/students/{student1_id}/score",
            json={"score_item_id": item1["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/students/{student2_id}/score",
            json={"score_item_id": item2["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # Get rankings
        response = test_client.get(
            f"/api/classes/{class_id}/stats/students",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        # Should be sorted by total_score descending
        assert data[0]["name"] == "张三"
        assert data[0]["total_score"] == 10
        assert data[1]["name"] == "李四"
        assert data[1]["total_score"] == 5


class TestGroupRankings:
    """Test group rankings endpoint."""

    def test_group_rankings_empty(self, test_client, auth_token):
        """Test group rankings for class with no groups."""
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "No Groups Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        response = test_client.get(
            f"/api/classes/{class_id}/stats/groups",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_group_rankings_with_groups(self, test_client, auth_token):
        """Test group rankings with groups and scores."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Group Rank Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Create groups
        group1 = test_client.post(
            f"/api/classes/{class_id}/groups",
            json={"name": "A组"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        group2 = test_client.post(
            f"/api/classes/{class_id}/groups",
            json={"name": "B组"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        group1_id = group1.json()["id"]
        group2_id = group2.json()["id"]

        # Add group scores
        item1 = create_score_item(
            test_client, auth_token, class_id, name="小组展示", score_value=15, subject="数学", target_type="group"
        )
        item2 = create_score_item(
            test_client, auth_token, class_id, name="小组讨论", score_value=8, subject="英语", target_type="group"
        )
        test_client.post(
            f"/api/groups/{group1_id}/score",
            json={"score_item_id": item1["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/groups/{group2_id}/score",
            json={"score_item_id": item2["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # Get rankings
        response = test_client.get(
            f"/api/classes/{class_id}/stats/groups",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        # Should be sorted by total_score descending
        assert data[0]["name"] == "A组"
        assert data[0]["total_score"] == 15
        assert data[1]["name"] == "B组"
        assert data[1]["total_score"] == 8


class TestSubjectStats:
    """Test subject stats endpoint."""

    def test_subject_stats_empty(self, test_client, auth_token):
        """Test subject stats for class with no scores."""
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Subject Stats Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        response = test_client.get(
            f"/api/classes/{class_id}/stats/subjects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_subject_stats_with_scores(self, test_client, auth_token):
        """Test subject stats with scores."""
        # Create class
        class_resp = test_client.post(
            "/api/classes/",
            json={"name": "Subject Class", "grade": "初一", "school_year": "2025-2026"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        class_id = class_resp.json()["id"]

        # Create student
        student = test_client.post(
            f"/api/classes/{class_id}/students",
            json={"name": "王五", "student_no": "003"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        student_id = student.json()["id"]

        # Add scores for different subjects
        math_item_1 = create_score_item(test_client, auth_token, class_id, name="数学A", score_value=5, subject="数学")
        math_item_2 = create_score_item(test_client, auth_token, class_id, name="数学B", score_value=3, subject="数学")
        english_item = create_score_item(test_client, auth_token, class_id, name="英语A", score_value=2, subject="英语")
        chinese_item = create_score_item(test_client, auth_token, class_id, name="语文提醒", score_value=1, score_type="minus", subject="语文")
        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": math_item_1["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": math_item_2["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": english_item["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/students/{student_id}/score",
            json={"score_item_id": chinese_item["id"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # Get subject stats
        response = test_client.get(
            f"/api/classes/{class_id}/stats/subjects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()

        # Should have stats for 3 subjects
        assert len(data) >= 3

        # Find 数学 stats
        math_stats = next((s for s in data if s["subject"] == "数学"), None)
        assert math_stats is not None
        assert math_stats["plus_count"] == 2
        assert math_stats["total_delta"] == 8  # 5 + 3
