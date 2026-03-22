# -*- coding: utf-8 -*-
"""Group member API coverage tests."""


def create_class_group_student_fixture(test_client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}

    class_resp = test_client.post(
        "/api/classes/",
        json={"name": "分组测试班", "grade": "初一", "school_year": "2025-2026"},
        headers=headers
    )
    class_id = class_resp.json()["id"]

    group_a = test_client.post(
        f"/api/classes/{class_id}/groups",
        json={"name": "A组"},
        headers=headers
    ).json()
    group_b = test_client.post(
        f"/api/classes/{class_id}/groups",
        json={"name": "B组"},
        headers=headers
    ).json()

    student = test_client.post(
        f"/api/classes/{class_id}/students",
        json={"name": "张三", "student_no": "001"},
        headers=headers
    ).json()

    return headers, class_id, group_a["id"], group_b["id"], student["id"]


def test_adding_same_member_twice_returns_existing_record(test_client, auth_token):
    headers, class_id, group_a_id, _group_b_id, student_id = create_class_group_student_fixture(test_client, auth_token)

    first = test_client.post(
        f"/api/classes/{class_id}/groups/{group_a_id}/members",
        json={"student_id": student_id},
        headers=headers
    )
    second = test_client.post(
        f"/api/classes/{class_id}/groups/{group_a_id}/members",
        json={"student_id": student_id},
        headers=headers
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]

    members = test_client.get(
        f"/api/classes/{class_id}/groups/{group_a_id}/members",
        headers=headers
    )
    assert members.status_code == 200
    assert len(members.json()) == 1


def test_moving_member_between_groups_updates_membership_and_student_group_id(test_client, auth_token):
    headers, class_id, group_a_id, group_b_id, student_id = create_class_group_student_fixture(test_client, auth_token)

    add_a = test_client.post(
        f"/api/classes/{class_id}/groups/{group_a_id}/members",
        json={"student_id": student_id},
        headers=headers
    )
    assert add_a.status_code == 200

    move_b = test_client.post(
        f"/api/classes/{class_id}/groups/{group_b_id}/members",
        json={"student_id": student_id},
        headers=headers
    )
    assert move_b.status_code == 200
    assert move_b.json()["group_id"] == group_b_id

    group_a_members = test_client.get(
        f"/api/classes/{class_id}/groups/{group_a_id}/members",
        headers=headers
    )
    group_b_members = test_client.get(
        f"/api/classes/{class_id}/groups/{group_b_id}/members",
        headers=headers
    )
    students = test_client.get(
        f"/api/classes/{class_id}/students",
        headers=headers
    )

    assert group_a_members.json() == []
    assert len(group_b_members.json()) == 1
    assert group_b_members.json()[0]["student_id"] == student_id
    assert students.json()[0]["group_id"] == group_b_id


def test_removing_member_clears_student_group_id(test_client, auth_token):
    headers, class_id, group_a_id, _group_b_id, student_id = create_class_group_student_fixture(test_client, auth_token)

    add_resp = test_client.post(
        f"/api/classes/{class_id}/groups/{group_a_id}/members",
        json={"student_id": student_id},
        headers=headers
    )
    assert add_resp.status_code == 200

    remove_resp = test_client.delete(
        f"/api/classes/{class_id}/groups/{group_a_id}/members/{student_id}",
        headers=headers
    )
    assert remove_resp.status_code == 204

    members = test_client.get(
        f"/api/classes/{class_id}/groups/{group_a_id}/members",
        headers=headers
    )
    students = test_client.get(
        f"/api/classes/{class_id}/students",
        headers=headers
    )

    assert members.json() == []
    assert students.json()[0]["group_id"] is None
