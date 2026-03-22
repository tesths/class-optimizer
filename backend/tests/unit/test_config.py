# -*- coding: utf-8 -*-
"""Configuration regression tests."""
import os
from pathlib import Path
import subprocess
import sys
import json


def run_python_script(
    script: str,
    extra_env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    """Run a backend Python snippet in a fresh process with optional env overrides."""
    env = os.environ.copy()
    env.pop("SECRET_KEY", None)
    env.pop("ENVIRONMENT", None)
    env.pop("DATABASE_URL", None)
    env.pop("CORS_ORIGINS", None)
    if extra_env:
        env.update(extra_env)
    backend_dir = Path(__file__).resolve().parents[2]
    return subprocess.run(
        [sys.executable, "-c", script],
        cwd=backend_dir,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )


def test_default_secret_key_is_available_in_development():
    """Development still gets a stable fallback secret key."""
    first = run_python_script(
        "from app.core.config import Settings; print(Settings().SECRET_KEY)",
        {"ENVIRONMENT": "development"},
    )
    second = run_python_script(
        "from app.core.config import Settings; print(Settings().SECRET_KEY)",
        {"ENVIRONMENT": "development"},
    )
    assert first.returncode == 0
    assert second.returncode == 0
    assert first.stdout.strip() == second.stdout.strip()


def test_production_requires_explicit_secret_key():
    """Production should reject the built-in development secret."""
    result = run_python_script(
        "from app.core.config import Settings; print(Settings().SECRET_KEY)",
        {"ENVIRONMENT": "production"},
    )
    assert result.returncode != 0
    assert "SECRET_KEY" in result.stderr or "SECRET_KEY" in result.stdout


def test_production_accepts_custom_secret_key():
    """Production should boot when a non-default secret key is configured."""
    result = run_python_script(
        "from app.core.config import Settings; print(Settings().SECRET_KEY)",
        {"ENVIRONMENT": "production", "SECRET_KEY": "replace-with-real-secret"}
    )
    assert result.returncode == 0
    assert result.stdout.strip() == "replace-with-real-secret"


def test_postgres_database_url_is_normalized_for_psycopg():
    """Zeabur's default Postgres URL should become SQLAlchemy psycopg format."""
    result = run_python_script(
        "from app.core.config import Settings; print(Settings().DATABASE_URL)",
        {
            "DATABASE_URL": "postgresql://root:secret@postgres.zeabur.internal:5432/zeabur",
        },
    )
    assert result.returncode == 0
    assert (
        result.stdout.strip()
        == "postgresql+psycopg://root:secret@postgres.zeabur.internal:5432/zeabur"
    )


def test_cors_origins_accept_comma_separated_values():
    """Zeabur-style comma-separated origins should parse without JSON syntax."""
    result = run_python_script(
        "from app.core.config import Settings; import json; print(json.dumps(Settings().CORS_ORIGINS))",
        {
            "CORS_ORIGINS": "https://frontend.zeabur.app, https://frontend.example.com",
        },
    )
    assert result.returncode == 0
    assert json.loads(result.stdout.strip()) == [
        "https://frontend.zeabur.app",
        "https://frontend.example.com",
    ]
