#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEFAULT_DB_PATH="data/class_optimizer.db"
DB_PATH="${DB_PATH:-$DEFAULT_DB_PATH}"
ALEMBIC_BIN="${ALEMBIC_BIN:-}"

if [[ -n "$ALEMBIC_BIN" ]]; then
  ALEMBIC_CMD=("$ALEMBIC_BIN" -c alembic.ini)
elif [[ -x ".venv/bin/alembic" ]]; then
  ALEMBIC_CMD=(".venv/bin/alembic" -c alembic.ini)
else
  ALEMBIC_CMD=("alembic" -c alembic.ini)
fi

export DATABASE_URL="${DATABASE_URL:-sqlite:///./${DB_PATH}}"

usage() {
  cat <<'EOF'
Usage:
  ./backend/scripts/db-maintenance.sh backup [label]
  ./backend/scripts/db-maintenance.sh current
  ./backend/scripts/db-maintenance.sh heads
  ./backend/scripts/db-maintenance.sh check
  ./backend/scripts/db-maintenance.sh upgrade
  ./backend/scripts/db-maintenance.sh stamp-head
  ./backend/scripts/db-maintenance.sh cleanup-temp

Environment overrides:
  DB_PATH       SQLite path relative to backend/ (default: data/class_optimizer.db)
  DATABASE_URL  Explicit SQLAlchemy URL. If unset, derived from DB_PATH.
  ALEMBIC_BIN   Explicit alembic executable.
EOF
}

require_db_file() {
  if [[ ! -f "$DB_PATH" ]]; then
    echo "Database file not found: $DB_PATH" >&2
    exit 1
  fi
}

backup_db() {
  require_db_file
  local label
  if [[ $# -ge 1 && -n "${1:-}" ]]; then
    label="$1"
  else
    label="$(date +%Y%m%d-%H%M%S)"
  fi
  local target="${DB_PATH}.bak-${label}"
  cp "$DB_PATH" "$target"
  echo "Backup created: $target"
}

run_alembic() {
  "${ALEMBIC_CMD[@]}" "$@"
}

cleanup_temp() {
  local paths=(
    "data/alembic_bootstrap.db"
    "data/alembic_validate.db"
    "data/alembic_validate_roundtrip.db"
    "data/class_optimizer_manage_probe.db"
    "data/class_optimizer_stamp_test.db"
    "data/playwright_import_mix.xlsx"
    "data/playwright_regression.db"
    "data/playwright_test.db"
  )

  for path in "${paths[@]}"; do
    if [[ -e "$path" ]]; then
      rm -f "$path"
      echo "Removed: $path"
    fi
  done
}

command="${1:-}"
if [[ -z "$command" ]]; then
  usage
  exit 1
fi
shift || true

case "$command" in
  backup)
    backup_db "${1:-}"
    ;;
  current)
    run_alembic current
    ;;
  heads)
    run_alembic heads
    ;;
  check)
    run_alembic check
    ;;
  upgrade)
    run_alembic upgrade head
    ;;
  stamp-head)
    run_alembic stamp head
    ;;
  cleanup-temp)
    cleanup_temp
    ;;
  *)
    usage
    exit 1
    ;;
esac
