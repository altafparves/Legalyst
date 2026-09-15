# CI Workflow (Lab 2.5, point 15)

**File:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

## Purpose

This GitHub Actions workflow is the project's continuous integration gate. It runs automatically on every `push` and `pull_request` targeting `main`, and checks that the codebase still lints and builds before any change is allowed onto the main branch. This catches broken code early — before it reaches a teammate's machine or a deployment — rather than relying on someone remembering to run checks manually.

## What it does

The workflow defines two independent jobs that run in parallel:

- **`backend`** — sets up Python 3.11, installs dependencies from `backend/requirements.txt`, and runs `ruff check .` to lint the FastAPI backend for style and correctness issues.
- **`frontend`** — sets up Node.js 20 (with npm caching), installs dependencies with `npm ci` for a reproducible install, then runs `npm run lint` and `npm run build` to lint the Next.js frontend and verify it compiles.

Each job only needs to pass its own checks; a failure in one does not block the other from reporting its own result, which makes it clear at a glance whether a broken build is a backend or frontend problem.

## Status

The workflow depends on the backend and frontend scaffolds ([#6](https://github.com/altafparves/Legalyst/issues/6), [#11](https://github.com/altafparves/Legalyst/issues/11)) existing in the repo. Until those land, the jobs will fail with "directory not found" because `backend/` and `frontend/` don't exist yet — the CI config itself is ready and will start passing once those scaffolds are merged.

The current CI status is shown as a badge at the top of the [README](../README.md).
