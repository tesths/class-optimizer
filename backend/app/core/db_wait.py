# -*- coding: utf-8 -*-
"""Database readiness helpers for deployment startup."""
from __future__ import annotations

import os
import time
from dataclasses import dataclass

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import OperationalError


DEFAULT_WAIT_TIMEOUT_SECONDS = 90
DEFAULT_WAIT_INTERVAL_SECONDS = 2
DEFAULT_CONNECT_TIMEOUT_SECONDS = 5


@dataclass(frozen=True)
class DatabaseWaitSettings:
    """Retry settings for database readiness checks."""

    timeout_seconds: int = DEFAULT_WAIT_TIMEOUT_SECONDS
    interval_seconds: int = DEFAULT_WAIT_INTERVAL_SECONDS
    connect_timeout_seconds: int = DEFAULT_CONNECT_TIMEOUT_SECONDS


def _read_positive_int(env_name: str, default: int) -> int:
    raw = os.getenv(env_name, "").strip()
    if not raw:
        return default

    value = int(raw)
    if value <= 0:
        raise ValueError(f"{env_name} 必须是正整数")
    return value


def load_database_wait_settings() -> DatabaseWaitSettings:
    """Load startup wait settings from environment variables."""
    return DatabaseWaitSettings(
        timeout_seconds=_read_positive_int("DB_WAIT_TIMEOUT_SECONDS", DEFAULT_WAIT_TIMEOUT_SECONDS),
        interval_seconds=_read_positive_int("DB_WAIT_INTERVAL_SECONDS", DEFAULT_WAIT_INTERVAL_SECONDS),
        connect_timeout_seconds=_read_positive_int(
            "DB_CONNECT_TIMEOUT_SECONDS",
            DEFAULT_CONNECT_TIMEOUT_SECONDS,
        ),
    )


def validate_database_url(database_url: str) -> str:
    """Reject obviously broken deployment values early."""
    normalized = database_url.strip()
    if not normalized:
        raise ValueError("DATABASE_URL 不能为空")
    if "${" in normalized:
        raise ValueError(
            "DATABASE_URL 仍包含未展开的 Zeabur 变量引用，请检查 Variables 配置"
        )
    return normalized


def mask_database_url(database_url: str) -> str:
    """Hide the password when printing the database URL."""
    return make_url(database_url).render_as_string(hide_password=True)


def _connect_args(url: URL, connect_timeout_seconds: int) -> dict[str, object]:
    if url.drivername.startswith("postgresql"):
        return {"connect_timeout": connect_timeout_seconds}
    if url.drivername.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def wait_for_database(
    database_url: str,
    settings: DatabaseWaitSettings,
    logger,
) -> None:
    """Block until the database accepts a trivial query or timeout expires."""
    database_url = validate_database_url(database_url)
    url = make_url(database_url)
    masked_url = mask_database_url(database_url)

    if url.drivername.startswith("sqlite"):
        logger(f"SQLite detected, skipping database readiness wait: {masked_url}")
        return

    deadline = time.monotonic() + settings.timeout_seconds
    attempt = 0
    last_error: Exception | None = None

    while time.monotonic() < deadline:
        attempt += 1
        engine = create_engine(
            database_url,
            connect_args=_connect_args(url, settings.connect_timeout_seconds),
            pool_pre_ping=True,
        )
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger(f"Database is ready: {masked_url}")
            return
        except OperationalError as exc:
            last_error = exc
            remaining = max(0, int(deadline - time.monotonic()))
            logger(
                "Waiting for database "
                f"(attempt {attempt}, {remaining}s left): {masked_url}. "
                f"Last error: {exc}"
            )
            time.sleep(settings.interval_seconds)
        finally:
            engine.dispose()

    raise TimeoutError(
        "数据库在等待时间内仍不可用："
        f"{masked_url}. 最后错误: {last_error}"
    )
