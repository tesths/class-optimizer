# -*- coding: utf-8 -*-
"""Auth step definitions for BDD tests."""
from pytest_bdd import given, when, then, parsers, scenario
import pytest


# Store context between steps
class AuthContext:
    def __init__(self):
        self.username = None
        self.password = None
        self.real_name = None
        self.subject = None
        self.token = None
        self.registered = False
        self.logged_in = False


@pytest.fixture
def auth_context():
    """Provide auth context for steps."""
    return AuthContext()


@scenario("../auth.feature", "成功注册并登录")
def test_register_and_login():
    """Test successful registration and login."""
    pass


@given("我在注册页面")
def at_register_page(auth_context):
    """Navigate to register page."""
    auth_context.registered = False
    auth_context.logged_in = False


@when(parsers.parse('填写 username="{username}" password="{password}" real_name="{real_name}" subject="{subject}"'))
def fill_register_form(test_client, auth_context, username, password, real_name, subject):
    """Fill the registration form."""
    auth_context.username = username
    auth_context.password = password
    auth_context.real_name = real_name
    auth_context.subject = subject

    response = test_client.post("/api/auth/register", json={
        "username": username,
        "password": password,
        "confirm_password": password,
        "real_name": real_name,
        "subject": subject
    })
    # Store response status for later assertions
    auth_context.register_response = response


@when("点击注册")
def click_register(auth_context):
    """Click register button."""
    # Registration was already done in previous step
    pass


@then("注册成功")
def verify_register_success(auth_context):
    """Verify registration was successful."""
    response = auth_context.register_response
    assert response.status_code in [200, 201], f"Registration failed with status {response.status_code}"
    auth_context.registered = True


@when('使用 teacher1 / Pass123 登录')
def login_with_credentials(test_client, auth_context):
    """Login with credentials."""
    response = test_client.post("/api/auth/login", data={
        "username": "teacher1",
        "password": "Pass123"
    })
    auth_context.login_response = response
    if response.status_code == 200:
        auth_context.token = response.json().get("access_token")
        auth_context.logged_in = True


@then("登录成功并跳转班级列表")
def verify_login_success(test_client, auth_context):
    """Verify login success and redirect to class list."""
    response = auth_context.login_response
    assert response.status_code == 200, f"Login failed with status {response.status_code}"

    # Verify token was returned
    data = response.json()
    assert "access_token" in data

    # Verify can access class list with token
    token = data["access_token"]
    list_response = test_client.get("/api/classes/", headers={
        "Authorization": f"Bearer {token}"
    })
    assert list_response.status_code == 200
