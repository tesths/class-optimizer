# -*- coding: utf-8 -*-
"""Group API regression tests."""


def test_add_group_member_returns_serialized_student(test_client, auth_token):
    """Adding a member should return 200 with a flat student payload."""
    class_resp = test_client.post(
        "/api/classes/",
        json={"name": "Group API Class", "grade": "初一", "school_year": "2025-2026"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    class_id = class_resp.json()["id"]

    student_resp = test_client.post(
        f"/api/classes/{class_id}/students",
        json={"name": "张三", "student_no": "001"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    student_id = student_resp.json()["id"]

    group_resp = test_client.post(
        f"/api/classes/{class_id}/groups",
        json={"name": "第一组"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    group_id = group_resp.json()["id"]

    add_resp = test_client.post(
        f"/api/classes/{class_id}/groups/{group_id}/members",
        json={"student_id": student_id},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert add_resp.status_code == 200
    data = add_resp.json()
    assert data["group_id"] == group_id
    assert data["student_id"] == student_id
    assert data["student"]["name"] == "张三"
    assert data["student"]["student_no"] == "001"

    groups_resp = test_client.get(
        f"/api/classes/{class_id}/groups",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert groups_resp.status_code == 200
    groups = groups_resp.json()
    assert groups[0]["member_count"] == 1


def test_create_group_with_leader_adds_leader_to_members(test_client, auth_token):
    """Setting a leader during creation should keep membership in sync."""
    headers = {"Authorization": f"Bearer {auth_token}"}
    class_resp = test_client.post(
        "/api/classes/",
        json={"name": "Leader Create Class", "grade": "初一", "school_year": "2025-2026"},
        headers=headers
    )
    class_id = class_resp.json()["id"]

    student_resp = test_client.post(
        f"/api/classes/{class_id}/students",
        json={"name": "张三", "student_no": "001"},
        headers=headers
    )
    student_id = student_resp.json()["id"]

    group_resp = test_client.post(
        f"/api/classes/{class_id}/groups",
        json={"name": "第一组", "leader_student_id": student_id},
        headers=headers
    )
    assert group_resp.status_code == 201
    assert group_resp.json()["leader_student_id"] == student_id
    assert group_resp.json()["member_count"] == 1

    members_resp = test_client.get(
        f"/api/classes/{class_id}/groups/{group_resp.json()['id']}/members",
        headers=headers
    )
    students_resp = test_client.get(
        f"/api/classes/{class_id}/students",
        headers=headers
    )

    assert members_resp.status_code == 200
    assert len(members_resp.json()) == 1
    assert members_resp.json()[0]["student_id"] == student_id
    assert students_resp.json()[0]["group_id"] == group_resp.json()["id"]


def test_updating_group_leader_moves_student_into_target_group(test_client, auth_token):
    """Changing the leader should move that student into the target group and clear old leadership."""
    headers = {"Authorization": f"Bearer {auth_token}"}
    class_resp = test_client.post(
        "/api/classes/",
        json={"name": "Leader Update Class", "grade": "初一", "school_year": "2025-2026"},
        headers=headers
    )
    class_id = class_resp.json()["id"]

    student_resp = test_client.post(
        f"/api/classes/{class_id}/students",
        json={"name": "张三", "student_no": "001"},
        headers=headers
    )
    student_id = student_resp.json()["id"]

    source_group = test_client.post(
        f"/api/classes/{class_id}/groups",
        json={"name": "源组", "leader_student_id": student_id},
        headers=headers
    ).json()
    target_group = test_client.post(
        f"/api/classes/{class_id}/groups",
        json={"name": "目标组"},
        headers=headers
    ).json()

    update_resp = test_client.put(
        f"/api/classes/{class_id}/groups/{target_group['id']}",
        json={"leader_student_id": student_id},
        headers=headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["leader_student_id"] == student_id
    assert update_resp.json()["member_count"] == 1

    source_group_resp = test_client.get(
        f"/api/classes/{class_id}/groups",
        headers=headers
    )
    source_group_state = next(group for group in source_group_resp.json() if group["id"] == source_group["id"])
    target_group_state = next(group for group in source_group_resp.json() if group["id"] == target_group["id"])

    source_members_resp = test_client.get(
        f"/api/classes/{class_id}/groups/{source_group['id']}/members",
        headers=headers
    )
    target_members_resp = test_client.get(
        f"/api/classes/{class_id}/groups/{target_group['id']}/members",
        headers=headers
    )

    assert source_group_state["leader_student_id"] is None
    assert target_group_state["leader_student_id"] == student_id
    assert source_members_resp.json() == []
    assert len(target_members_resp.json()) == 1
    assert target_members_resp.json()[0]["student_id"] == student_id
