# -*- coding: utf-8 -*-
"""Lazy exports for utility helpers.

Avoid importing auth helpers at module import time because model modules also
depend on utility constants, which can otherwise create circular imports.
"""

from typing import Any

__all__ = [
    "check_class_access",
    "check_class_admin",
    "get_user_class_role",
    "require_class_admin",
    "calculate_growth_stage",
]


def __getattr__(name: str) -> Any:
    if name == "calculate_growth_stage":
        from app.utils.growth import calculate_growth_stage

        return calculate_growth_stage

    if name in {"check_class_access", "check_class_admin", "get_user_class_role", "require_class_admin"}:
        from app.utils.auth import (
            check_class_access,
            check_class_admin,
            get_user_class_role,
            require_class_admin,
        )

        return {
            "check_class_access": check_class_access,
            "check_class_admin": check_class_admin,
            "get_user_class_role": get_user_class_role,
            "require_class_admin": require_class_admin,
        }[name]

    raise AttributeError(f"module 'app.utils' has no attribute {name!r}")
