#!/usr/bin/env python3
"""Read the first worksheet of an Excel workbook into JSON for Playwright tests."""
from __future__ import annotations

import json
import sys
from io import BytesIO
from pathlib import Path

import openpyxl


def main() -> None:
    file_path = Path(sys.argv[1])
    max_rows = int(sys.argv[2])
    max_cols = int(sys.argv[3])

    workbook = openpyxl.load_workbook(BytesIO(file_path.read_bytes()))
    sheet = workbook.active

    rows: list[list[str]] = []
    for row in sheet.iter_rows(min_row=1, max_row=max_rows, max_col=max_cols, values_only=True):
        rows.append(["" if value is None else str(value) for value in row])

    print(json.dumps(rows, ensure_ascii=False))


if __name__ == "__main__":
    main()
