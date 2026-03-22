# -*- coding: utf-8 -*-
"""Pytest configuration and fixtures."""
import sys
import os

# Add the backend directory to sys.path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from typing import Generator

# Test database URL
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a test database session."""
    test_engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(test_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # Import models to register them with Base.metadata
    from app.core.database import Base
    from app.models import User, TeacherProfile, Class, ClassTeacher, Term, Student, StudentGroup, GroupMember, ScoreItem, StudentScoreLog, GroupScoreLog, ImportJob

    # Create all tables
    Base.metadata.create_all(bind=test_engine)

    session = testing_session_local()
    try:
        yield session
    finally:
        session.close()
        # Disposing the in-memory engine drops the whole transient database.
        test_engine.dispose()


@pytest.fixture(scope="function")
def test_client(db_session: Session):
    """Create a test FastAPI client with test database."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import get_db

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def auth_token(test_client):
    """Create a test user and return JWT token."""
    # Register
    test_client.post("/api/auth/register", json={
        "username": "testteacher",
        "password": "testpass123",
        "confirm_password": "testpass123",
        "real_name": "Test Teacher",
        "subject": "Math"
    })
    # Login
    response = test_client.post("/api/auth/login", data={
        "username": "testteacher",
        "password": "testpass123"
    })
    return response.json()["access_token"]
