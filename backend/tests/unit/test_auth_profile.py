# -*- coding: utf-8 -*-
"""Authentication profile and password tests."""


def test_get_me_returns_teacher_profile(test_client, auth_token):
    response = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testteacher"
    assert data["teacher_profile"]["real_name"] == "Test Teacher"
    assert data["teacher_profile"]["subject"] == "Math"


def test_update_profile_persists_teacher_fields(test_client, auth_token):
    response = test_client.put(
        "/api/auth/profile",
        json={
            "real_name": "Updated Teacher",
            "subject": "Physics",
            "phone": "13800000000",
            "email": "teacher@example.com",
            "bio": "班主任"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 200
    assert response.json()["message"] == "更新成功"

    me = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    data = me.json()
    assert data["teacher_profile"]["real_name"] == "Updated Teacher"
    assert data["teacher_profile"]["subject"] == "Physics"
    assert data["teacher_profile"]["phone"] == "13800000000"
    assert data["teacher_profile"]["email"] == "teacher@example.com"
    assert data["teacher_profile"]["bio"] == "班主任"


def test_change_password_allows_login_with_new_password_only(test_client, auth_token):
    response = test_client.put(
        "/api/auth/password",
        json={"old_password": "testpass123", "new_password": "newpass456"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 200
    assert response.json()["message"] == "密码修改成功"

    old_login = test_client.post("/api/auth/login", data={
        "username": "testteacher",
        "password": "testpass123"
    })
    assert old_login.status_code == 401

    new_login = test_client.post("/api/auth/login", data={
        "username": "testteacher",
        "password": "newpass456"
    })
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()


def test_change_password_rejects_wrong_old_password(test_client, auth_token):
    response = test_client.put(
        "/api/auth/password",
        json={"old_password": "wrong-old-password", "new_password": "newpass456"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "原密码错误"
