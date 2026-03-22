# -*- coding: utf-8 -*-
"""Database readiness helper tests."""
from app.core.db_wait import (
    DatabaseWaitSettings,
    mask_database_url,
    validate_database_url,
    wait_for_database,
)


def test_mask_database_url_hides_password():
    masked = mask_database_url("postgresql+psycopg://root:secret@postgres.zeabur.internal:5432/zeabur")
    assert masked == "postgresql+psycopg://root:***@postgres.zeabur.internal:5432/zeabur"


def test_validate_database_url_rejects_unexpanded_reference():
    try:
        validate_database_url("${POSTGRES_CONNECTION_STRING}")
    except ValueError as exc:
        assert "未展开" in str(exc)
    else:
        raise AssertionError("Expected validate_database_url to reject Zeabur placeholders")


def test_wait_for_database_skips_sqlite():
    messages: list[str] = []
    wait_for_database(
        "sqlite:///./data/class_optimizer.db",
        DatabaseWaitSettings(timeout_seconds=1, interval_seconds=1, connect_timeout_seconds=1),
        logger=messages.append,
    )
    assert messages == ["SQLite detected, skipping database readiness wait: sqlite:///./data/class_optimizer.db"]
