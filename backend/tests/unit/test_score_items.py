# -*- coding: utf-8 -*-
"""Score items module tests."""
import pytest


def create_test_class(test_client, auth_token):
    """Helper function to create a test class."""
    class_response = test_client.post("/api/classes", json={
        "name": "Test Class",
        "grade": "初一",
        "school_year": "2025-2026"
    }, headers={"Authorization": f"Bearer {auth_token}"})
    return class_response.json()["id"]


class TestScoreItemCreate:
    """Test score item creation."""

    def test_create_score_item_plus(self, test_client, auth_token):
        """Test creating a +分 score item."""
        class_id = create_test_class(test_client, auth_token)

        response = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={
                "name": "课堂发言",
                "score_type": "plus",
                "score_value": 5,
                "subject": "语文",
                "enabled": True,
                "sort_order": 1
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "课堂发言"
        assert data["score_type"] == "plus"
        assert data["score_value"] == 5
        assert data["subject"] == "语文"
        assert data["enabled"] is True
        assert data["class_id"] == class_id

    def test_create_score_item_minus(self, test_client, auth_token):
        """Test creating a -分 score item."""
        class_id = create_test_class(test_client, auth_token)

        response = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={
                "name": "迟到",
                "score_type": "minus",
                "score_value": 2,
                "enabled": True,
                "sort_order": 10
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "迟到"
        assert data["score_type"] == "minus"
        assert data["score_value"] == 2
        assert data["enabled"] is True


class TestScoreItemUpdate:
    """Test score item update."""

    def test_update_score_item(self, test_client, auth_token):
        """Test updating score item name and score_value."""
        class_id = create_test_class(test_client, auth_token)

        # Create score item
        create_response = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={
                "name": "作业完成",
                "score_type": "plus",
                "score_value": 10,
                "enabled": True,
                "sort_order": 1
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        item_id = create_response.json()["id"]

        # Update score item
        response = test_client.put(
            f"/api/classes/{class_id}/score-items/{item_id}",
            json={
                "name": "作业优秀",
                "score_value": 15
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "作业优秀"
        assert data["score_value"] == 15


class TestScoreItemToggle:
    """Test score item enabled toggle."""

    def test_toggle_score_item_enabled(self, test_client, auth_token):
        """Test setting enabled=False for a score item."""
        class_id = create_test_class(test_client, auth_token)

        # Create score item
        create_response = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={
                "name": "测试项目",
                "score_type": "plus",
                "score_value": 5,
                "enabled": True,
                "sort_order": 1
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        item_id = create_response.json()["id"]

        # Disable score item
        response = test_client.put(
            f"/api/classes/{class_id}/score-items/{item_id}",
            json={"enabled": False},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is False


class TestScoreItemDelete:
    """Test score item deletion."""

    def test_delete_score_item(self, test_client, auth_token):
        """Test deleting a score item."""
        class_id = create_test_class(test_client, auth_token)

        # Create score item
        create_response = test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={
                "name": "待删除项目",
                "score_type": "plus",
                "score_value": 5,
                "enabled": True,
                "sort_order": 1
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        item_id = create_response.json()["id"]

        # Delete score item
        response = test_client.delete(
            f"/api/classes/{class_id}/score-items/{item_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 204

        # Verify item is deleted
        list_response = test_client.get(
            f"/api/classes/{class_id}/score-items",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        items = list_response.json()
        assert not any(item["id"] == item_id for item in items)


class TestScoreItemList:
    """Test score item listing."""

    def test_list_score_items_by_class(self, test_client, auth_token):
        """Test listing all score items for a class."""
        class_id = create_test_class(test_client, auth_token)

        # Create multiple score items
        test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={"name": "加分1", "score_type": "plus", "score_value": 5, "sort_order": 1},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={"name": "加分2", "score_type": "plus", "score_value": 10, "sort_order": 2},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        test_client.post(
            f"/api/classes/{class_id}/score-items",
            json={"name": "扣分1", "score_type": "minus", "score_value": 3, "sort_order": 3},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # List score items
        response = test_client.get(
            f"/api/classes/{class_id}/score-items",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3
        # Verify all items belong to the class
        assert all(item["class_id"] == class_id for item in data)
