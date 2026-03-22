# -*- coding: utf-8 -*-
"""Migration ordering regression tests."""
from __future__ import annotations

import ast
from pathlib import Path


INITIAL_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "alembic"
    / "versions"
    / "982684282f94_initial_schema.py"
)


def _call_name(node: ast.AST) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        parent = _call_name(node.value)
        return f"{parent}.{node.attr}" if parent else node.attr
    return None


def _literal_string(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def _load_upgrade_calls() -> list[ast.Call]:
    module = ast.parse(INITIAL_MIGRATION.read_text(encoding="utf-8"))
    for node in module.body:
        if isinstance(node, ast.FunctionDef) and node.name == "upgrade":
            return [stmt.value for stmt in node.body if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call)]
    raise AssertionError("upgrade() not found in initial migration")


def test_initial_migration_creates_foreign_key_targets_first():
    """Each table should be created only after its FK targets already exist."""
    created_tables: set[str] = set()

    for call in _load_upgrade_calls():
        if _call_name(call.func) != "op.create_table":
            continue

        table_name = _literal_string(call.args[0])
        assert table_name is not None

        referenced_tables: set[str] = set()
        for arg in call.args[1:]:
            if not isinstance(arg, ast.Call):
                continue
            if _call_name(arg.func) != "sa.ForeignKeyConstraint":
                continue

            target_list = arg.args[1]
            if not isinstance(target_list, ast.List):
                continue

            for target in target_list.elts:
                value = _literal_string(target)
                assert value is not None
                referenced_tables.add(value.split(".", 1)[0])

        missing_targets = referenced_tables - created_tables
        assert not missing_targets, (
            f"{table_name} is created before its FK targets exist: {sorted(missing_targets)}"
        )
        created_tables.add(table_name)


def test_initial_migration_drops_tables_in_reverse_dependency_order():
    """Dependent tables should be dropped before the tables they reference."""
    referenced_by: dict[str, set[str]] = {}

    for call in _load_upgrade_calls():
        if _call_name(call.func) != "op.create_table":
            continue

        table_name = _literal_string(call.args[0])
        assert table_name is not None

        for arg in call.args[1:]:
            if not isinstance(arg, ast.Call):
                continue
            if _call_name(arg.func) != "sa.ForeignKeyConstraint":
                continue

            target_list = arg.args[1]
            if not isinstance(target_list, ast.List):
                continue

            for target in target_list.elts:
                value = _literal_string(target)
                assert value is not None
                target_table = value.split(".", 1)[0]
                referenced_by.setdefault(target_table, set()).add(table_name)

    module = ast.parse(INITIAL_MIGRATION.read_text(encoding="utf-8"))
    downgrade = next(
        node for node in module.body if isinstance(node, ast.FunctionDef) and node.name == "downgrade"
    )
    dropped_tables: set[str] = set()

    for stmt in downgrade.body:
        if not isinstance(stmt, ast.Expr) or not isinstance(stmt.value, ast.Call):
            continue
        call = stmt.value
        if _call_name(call.func) != "op.drop_table":
            continue

        table_name = _literal_string(call.args[0])
        assert table_name is not None

        dependents = referenced_by.get(table_name, set()) - dropped_tables
        assert not dependents, (
            f"{table_name} is dropped before dependent tables: {sorted(dependents)}"
        )
        dropped_tables.add(table_name)
