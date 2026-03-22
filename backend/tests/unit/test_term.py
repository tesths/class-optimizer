# -*- coding: utf-8 -*-
"""Term API tests."""


def create_term(test_client, auth_token, name="2025春季学期"):
    response = test_client.post(
        "/api/terms",
        json={
            "name": name,
            "start_date": "2025-02-17",
            "end_date": "2025-07-01"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    return response


def test_create_and_list_terms(test_client, auth_token):
    create_resp = create_term(test_client, auth_token)
    assert create_resp.status_code == 201
    assert create_resp.json()["name"] == "2025春季学期"

    list_resp = test_client.get(
        "/api/terms",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["name"] == "2025春季学期"


def test_create_term_rejects_invalid_date_range(test_client, auth_token):
    response = test_client.post(
        "/api/terms",
        json={
            "name": "错误学期",
            "start_date": "2025-07-01",
            "end_date": "2025-07-01"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "结束日期必须晚于开始日期"


def test_update_term(test_client, auth_token):
    create_resp = create_term(test_client, auth_token)
    term_id = create_resp.json()["id"]

    update_resp = test_client.put(
        f"/api/terms/{term_id}",
        json={
            "name": "2025秋季学期",
            "end_date": "2026-01-15"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["name"] == "2025秋季学期"
    assert data["end_date"] == "2026-01-15"


def test_delete_term(test_client, auth_token):
    create_resp = create_term(test_client, auth_token)
    term_id = create_resp.json()["id"]

    delete_resp = test_client.delete(
        f"/api/terms/{term_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert delete_resp.status_code == 204

    list_resp = test_client.get(
        "/api/terms",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert list_resp.status_code == 200
    assert list_resp.json() == []


def test_terms_are_scoped_per_user(test_client, auth_token):
    create_resp = create_term(test_client, auth_token, name="仅自己可见")
    term_id = create_resp.json()["id"]

    test_client.post("/api/auth/register", json={
        "username": "otherteacher",
        "password": "testpass123",
        "confirm_password": "testpass123",
        "real_name": "Other Teacher",
        "subject": "English"
    })
    login_resp = test_client.post("/api/auth/login", data={
        "username": "otherteacher",
        "password": "testpass123"
    })
    other_token = login_resp.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    list_resp = test_client.get("/api/terms", headers=other_headers)
    update_resp = test_client.put(
        f"/api/terms/{term_id}",
        json={"name": "尝试篡改"},
        headers=other_headers
    )
    delete_resp = test_client.delete(
        f"/api/terms/{term_id}",
        headers=other_headers
    )

    assert list_resp.status_code == 200
    assert list_resp.json() == []
    assert update_resp.status_code == 404
    assert delete_resp.status_code == 404
