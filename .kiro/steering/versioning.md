# Versioning

This project uses semantic versioning (MAJOR.MINOR.PATCH).

## Single source of truth

The version is defined in one place only: `APP_VERSION` in `app.py`. This value is passed to the Jinja template and displayed in the web UI footer, and is logged to the terminal on server startup.

Do not hardcode version strings anywhere else. Always reference `APP_VERSION`.

## When to bump

- PATCH (e.g. 1.2.0 → 1.2.1): Bug fixes, minor copy changes, styling tweaks.
- MINOR (e.g. 1.2.1 → 1.3.0): New features, new options, new endpoints.
- MAJOR (e.g. 1.3.0 → 2.0.0): Breaking changes to the bundle format, API, or config structure.

## Rules

- Every feature branch that adds or changes functionality must include a version bump before merging.
- Update `APP_VERSION` in `app.py` as the last step before committing a feature, so it reflects the final state of the change.
- Commit messages for version bumps should follow the format: `chore: bump version to X.Y.Z`.
