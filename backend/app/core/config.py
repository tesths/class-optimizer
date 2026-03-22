# -*- coding: utf-8 -*-
"""Application configuration."""
import json
from pathlib import Path
from typing import Annotated
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_settings import NoDecode
from pydantic import field_validator, model_validator
from functools import lru_cache

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "class_optimizer.db"
DEFAULT_SECRET_KEY = "class-optimizer-dev-secret-key-change-me"


class Settings(BaseSettings):
    """应用配置"""

    APP_NAME: str = "班级优化积分系统"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_PREFIX: str = "/api"

    # 数据库
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"

    # JWT - override via environment in production
    SECRET_KEY: str = DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=str(BACKEND_DIR / ".env"), case_sensitive=True)

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value):
        """Accept Zeabur/Postgres URLs and map them to SQLAlchemy's psycopg driver."""
        if not isinstance(value, str):
            return value

        stripped = value.strip()
        if "://" not in stripped:
            return stripped

        scheme, rest = stripped.split("://", 1)
        normalized_scheme = scheme.lower()
        if normalized_scheme in {"postgres", "postgresql"}:
            return f"postgresql+psycopg://{rest}"

        return stripped

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        """Allow JSON arrays or comma-separated origins in env vars."""
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                parsed = json.loads(stripped)
                if not isinstance(parsed, list):
                    raise ValueError("CORS_ORIGINS 必须是字符串数组")
                return parsed
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def validate_secret_key(self) -> "Settings":
        """Block production deployments that still use the predictable dev key."""
        if self.ENVIRONMENT.lower() == "production" and self.SECRET_KEY == DEFAULT_SECRET_KEY:
            raise ValueError("生产环境必须通过 SECRET_KEY 覆盖默认开发密钥")
        return self


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()
