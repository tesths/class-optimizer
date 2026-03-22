# Backend Data Directory

This directory keeps the minimum committed fixtures plus the active local runtime database.

- `import_regression.xlsx`: regression fixture used by frontend E2E import coverage.
- `import_invalid_content.xlsx`: invalid workbook fixture for import validation coverage.
- `import_large_batch.xlsx`: large workbook fixture for batch import coverage.
- `import_mixed_validation.xlsx`: mixed-validity workbook fixture for import preview and validation coverage.
- `class_optimizer.db`: local development SQLite database created at runtime.

Operational rules:

- Treat `*.db` files in this directory as local state, not source-controlled assets.
- Before stamping or upgrading a long-lived local database, create a timestamped backup and keep it outside the committed workspace.
- Use `backend/scripts/db-maintenance.sh` for routine database maintenance instead of ad hoc commands.
- Use `./backend/scripts/db-maintenance.sh cleanup-temp` to remove migration validation and Playwright temp artifacts.
*** End of File
