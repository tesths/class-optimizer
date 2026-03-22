# -*- coding: utf-8 -*-
"""Wait until the configured database accepts connections."""
from __future__ import annotations

import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings
from app.core.db_wait import load_database_wait_settings, mask_database_url, wait_for_database


def main() -> int:
    settings = get_settings()
    wait_settings = load_database_wait_settings()
    masked_url = mask_database_url(settings.DATABASE_URL)
    print(f"Checking database readiness: {masked_url}", flush=True)

    try:
        wait_for_database(
            settings.DATABASE_URL,
            wait_settings,
            logger=lambda message: print(message, flush=True),
        )
    except Exception as exc:
        print(f"Database readiness check failed: {exc}", file=sys.stderr, flush=True)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
