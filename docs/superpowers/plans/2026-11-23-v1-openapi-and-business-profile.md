# FastAPI v1 OpenAPI Contract (#83) & Business Profile API (#77) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the FastAPI `/api/v1/*` OpenAPI schemas and service layer contracts (`#83`), add an Alembic migration for `business_profiles` (`business_scale`, `is_manual_override`) applied to Supabase, and implement the JWT-authenticated Business Profile API (`#77`).

**Architecture:** We extend `BusinessProfile` in `backend/app/models.py` with `business_scale` and `is_manual_override` via a new Alembic revision (`2a8f4c1e9b01`), define all `/api/v1/*` Pydantic v2 schemas in `backend/app/schemas.py`, build modular services in `backend/app/services/` (`kbli.py`, `business_profile.py`, `profiler.py`, `compliance.py`, `documents.py`), and mount `/api/v1/business-profile` and `/api/v1/*` routers in `backend/app/main.py`.

**Tech Stack:** Python 3.12, FastAPI 0.115, SQLAlchemy 2.0, Alembic 1.13, Pydantic v2, PostgreSQL 16 + `pgvector` (Supabase), Pytest, Ruff.

**Spec:** `docs/superpowers/specs/2026-11-23-v1-openapi-and-business-profile-design.md`

## Global Constraints

- KBLI codes must be validated against the 313 5-digit codes in `data/kbli_2025.csv` (KBLI 2025).
- No Azure dependencies; database is Supabase PostgreSQL (`DATABASE_URL`).
- Tracks (`OSS`, `PIRT`, `HALAL`, `SPT`) without ingested rows in `obligations` must return `track_status: "coming_soon"` (Day 8 Fri 28 Nov data cutoff rule).
- `ChecklistResponse` must include both flat `obligations: list[ChecklistItem]` (for `frontend/lib/compliance.ts`) and `tracks: dict[ObligationTrack, TrackChecklistGroup]`.

## Review Focus

- Unauthenticated requests to `POST /api/v1/business-profile` or `GET /api/v1/business-profile` must return `401 Unauthorized`.
- Submitting a 5-digit code that does not exist in `data/kbli_2025.csv` (e.g., `"99999"`) to `POST /api/v1/business-profile` or `POST /api/v1/compliance/checklist` must return `422 Unprocessable Entity`.
- Calling `GET /api/v1/business-profile`, `POST /api/v1/documents/generate`, or `POST /api/v1/compliance/checklist` (with no body) when the user has not saved a profile yet must return `404 Not Found` (or `400 Bad Request` if unauthenticated without body).
- Calling `POST /api/v1/business-profile` twice for the same user must update the existing `business_profiles` row (upsert), not create duplicate profile rows.
- Tracks without ingested rows (`PIRT`, `HALAL`, `SPT`) must return `track_status == "coming_soon"` and `items == []`.

---

### Task 1: Alembic Migration & ORM Update for `business_profiles` (`#77`)

**Files:**
- Modify: `backend/app/models.py:21-34`
- Create: `backend/alembic/versions/2a8f4c1e9b01_add_scale_and_override_to_business_profiles.py`
- Modify: `docs/schema.md`

**Interfaces:**
- Produces: `BusinessProfile.business_scale: Mapped[str]` (`String(20)`, default `"mikro"`) and `BusinessProfile.is_manual_override: Mapped[bool]` (`Boolean`, default `False`).

- [ ] **Step 1: Add `business_scale` and `is_manual_override` columns to `BusinessProfile` in `backend/app/models.py`**

Add `Boolean` to SQLAlchemy imports and add:
```python
    business_scale: Mapped[str] = mapped_column(String(20), nullable=False, default="mikro", server_default="mikro")
    is_manual_override: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
```

- [ ] **Step 2: Create Alembic migration `backend/alembic/versions/2a8f4c1e9b01_add_scale_and_override_to_business_profiles.py`**

Revises `1dda096b9349`. In `upgrade()`, add `business_scale` and `is_manual_override` to `business_profiles`; in `downgrade()`, drop both columns.

- [ ] **Step 3: Apply the Alembic migration to Supabase PostgreSQL**

Run: `cd backend && .venv/bin/alembic upgrade head && .venv/bin/alembic current`
Expected: Upgrades `1dda096b9349 -> 2a8f4c1e9b01 (head)` against `DATABASE_URL` in `backend/.env`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/models.py backend/alembic/versions/2a8f4c1e9b01_add_scale_and_override_to_business_profiles.py
git commit -m "feat(db): add business_scale and is_manual_override to business_profiles (#77)"
```

---

### Task 2: Freeze FastAPI v1 Pydantic Schemas & KBLI 2025 Catalog Service (`#83`, `#77`)

**Files:**
- Modify: `backend/app/schemas.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/kbli.py`

**Interfaces:**
- Produces in `backend/app/schemas.py`:
  - `BusinessScale`, `RiskTier`, `ObligationTrack`, `TrackStatusLiteral`, `DocumentTypeLiteral`, `DocumentStatusLiteral`, `LEGAL_DISCLAIMER_ID`
  - `ProfilerMatchRequest`, `KbliCandidate`, `ProfilerMatchResponse`
  - `BusinessProfileUpsertRequest`, `BusinessProfileResponse`
  - `ChecklistRequest`, `ChecklistItem`, `TrackChecklistGroup`, `ChecklistResponse`
  - `ChatAskRequest`, `ChatCitation`, `ChatAskResponse`
  - `DocumentGenerateRequest`, `GeneratedDocumentItem`, `DocumentListResponse`
- Produces in `backend/app/services/kbli.py`:
  - `KbliEntry(kode, judul, deskripsi, kategori, sumber_url, default_risk_tier)`
  - `load_kbli_catalog() -> dict[str, KbliEntry]`
  - `get_kbli_entry(kbli_code: str) -> KbliEntry | None`

- [ ] **Step 1: Define all v1 Pydantic schemas in `backend/app/schemas.py`**

Include all request/response models matching the spec in `docs/superpowers/specs/2026-11-23-v1-openapi-and-business-profile-design.md`.

- [ ] **Step 2: Implement `backend/app/services/kbli.py`**

Load `data/kbli_2025.csv` (313 rows) and derive `default_risk_tier` per KBLI from `data/obligations_oss.csv`.

- [ ] **Step 3: Verify schema imports and KBLI catalog loader**

Run: `cd backend && .venv/bin/python -c "from app.services.kbli import load_kbli_catalog, get_kbli_entry; cat = load_kbli_catalog(); assert len(cat) == 313; assert get_kbli_entry('10794').default_risk_tier == 'rendah'"`
Expected: Exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas.py backend/app/services/__init__.py backend/app/services/kbli.py
git commit -m "feat(schemas): freeze FastAPI v1 OpenAPI Pydantic contracts and KBLI 2025 loader (#83)"
```

---

### Task 3: Business Profile Service, v1 Services & API Routers (`#77`, `#83`)

**Files:**
- Create: `backend/app/services/business_profile.py`
- Create: `backend/app/services/profiler.py`
- Create: `backend/app/services/compliance.py`
- Create: `backend/app/services/documents.py`
- Create: `backend/app/routers/business_profile.py`
- Create: `backend/app/routers/v1.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_business_profile.py`
- Modify: `docs/schema.md`

**Interfaces:**
- Consumes: `BusinessProfile` from Task 1; schemas and `get_kbli_entry` from Task 2.
- Produces:
  - `upsert_user_business_profile(db: Session, user: User, payload: BusinessProfileUpsertRequest) -> BusinessProfileResponse`
  - `get_user_business_profile(db: Session, user: User) -> BusinessProfileResponse`
  - `match_kbli(description: str) -> list[KbliCandidate]`
  - `generate_checklist(db: Session, kbli_code: str, business_scale: BusinessScale = "mikro", description: str | None = None) -> ChecklistResponse`
  - `answer_compliance_question(db: Session, question: str, kbli_code: str | None = None) -> ChatAskResponse`
  - Mounted routes: `/api/v1/business-profile`, `/api/v1/profiler/match`, `/api/v1/compliance/checklist`, `/api/v1/chat/ask`, `/api/v1/documents/generate`, `/api/v1/documents`, `/api/v1/documents/download-zip`.

- [ ] **Step 1: Write the failing tests in `backend/tests/test_business_profile.py`**

Include tests covering:
- `test_business_profile_requires_authentication` (`401` on `GET` and `POST` without JWT)
- `test_get_business_profile_returns_404_when_none_saved`
- `test_upsert_and_get_business_profile_with_valid_kbli` (verifies `business_scale`, `is_manual_override`, `risk_tier`, `kbli_title`, and single-row upsert behavior)
- `test_upsert_business_profile_rejects_unknown_kbli_code` (`422` for `"99999"`)
- `test_checklist_and_documents_fallback_to_saved_business_profile` (verifies calling `/api/v1/compliance/checklist` and `/api/v1/documents/*` with no body loads the user's saved DB profile and sets `track_status == "coming_soon"` for `PIRT`, `HALAL`, `SPT`)
- `test_profiler_and_chat_v1_contracts`

- [ ] **Step 2: Run pytest to verify tests fail before implementation**

Run: `cd backend && .venv/bin/pytest tests/test_business_profile.py -v`
Expected: FAIL (`404 Not Found` on `/api/v1/*` routes).

- [ ] **Step 3: Implement services (`business_profile.py`, `profiler.py`, `compliance.py`, `documents.py`), routers (`business_profile.py`, `v1.py`), mount in `backend/app/main.py`, and update `docs/schema.md`**

Use `BusinessProfile.business_scale` and `BusinessProfile.is_manual_override` directly on the SQLAlchemy model.

- [ ] **Step 4: Run `ruff check .` and `pytest -v`**

Run: `cd backend && .venv/bin/ruff check . && .venv/bin/pytest -v`
Expected: All checks passed; all tests in `test_auth.py` and `test_business_profile.py` PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/ docs/schema.md docs/superpowers/
git commit -m "feat(backend): implement Business Profile API and v1 OpenAPI routers/services (#83, #77)"
```

