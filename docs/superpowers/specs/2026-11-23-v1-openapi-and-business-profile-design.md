# FastAPI v1 OpenAPI Contract (#83) & Business Profile API (#77) — Design Spec

**Date:** 2026-11-23  
**Author:** Altaf Parves (`@altafparves`)  
**Issues:** `#83`, `#77`  
**Branch:** `feat/issue-83-77-api-contract-profile`

## 1. Intent & Why
Frontend (`Diffie`, `Dimas`) and AI (`Calvin`) need a frozen, authoritative `/api/v1/*` OpenAPI contract in `backend/app/schemas.py` and service boundaries in `backend/app/services/` so parallel Sprint 1–2 work integrates without contract drift (`#83`). At the same time, Screen 1 (`/onboarding`), Screen 2 (`/dashboard`), and Screen 3 (`/documents`) need a persisted `BusinessProfile` in PostgreSQL per authenticated user with validated 5-digit KBLI 2025 codes, business scale, risk tier, and manual-override tracking (`#77`).

## 2. Goals, Non-Goals & Anti-Goals
- **Goals:**
  1. Add a proper Alembic migration adding `business_scale` (`VARCHAR(20)`, default `'mikro'`) and `is_manual_override` (`BOOLEAN`, default `false`) to `business_profiles`, and apply it to Supabase PostgreSQL.
  2. Define all Pydantic v2 request/response schemas in `backend/app/schemas.py` for `/api/v1/profiler/match`, `/api/v1/business-profile`, `/api/v1/compliance/checklist`, `/api/v1/chat/ask`, and `/api/v1/documents/*`.
  3. Implement `POST /api/v1/business-profile` (upsert for current JWT user with 5-digit KBLI 2025 validation against `data/kbli_2025.csv`) and `GET /api/v1/business-profile`.
  4. Expose working baseline service functions (`match_kbli`, `generate_checklist`, `answer_compliance_question`, `generate_user_documents`, `list_user_documents`, `build_documents_zip_bytes`) so `/api/v1/compliance/checklist` and `/api/v1/documents/*` fall back to the user's saved DB profile when no body is sent, and enforce the **Day 8 (Fri 28 Nov) data cutoff rule** (`track_status: "ready" | "coming_soon"`).
- **Non-Goals:**
  - Full Meta LLM (`muse-spark-1.3`) prompt tuning for checklist synthesis (`#68`) or full PDF styling/Supabase Storage upload (`#69`), which are separate Week 2 tickets.
- **Anti-Goals:**
  - Never hallucinate obligations for tracks (`PIRT`, `HALAL`, `SPT`) that have zero ingested rows in `obligations`.
  - Never accept a KBLI code that is not a valid 5-digit code in `data/kbli_2025.csv`.

## 3. Approaches Considered
1. **Approach 1 (Chosen) — Working Baseline Services Behind Frozen Schemas + Proper Alembic Migration:**
   - Add real `business_scale` and `is_manual_override` columns via Alembic migration, freeze all `/api/v1/*` Pydantic schemas, and back the service layer with real KBLI 2025 (`data/kbli_2025.csv`) and OSS-RBA (`obligations` table / `data/obligations_oss.csv`) data.
2. **Approach 2 (Rejected) — Empty `501 Not Implemented` Route Stubs:**
   - Does not satisfy `#77`'s requirement that checklist and documents endpoints read the saved profile from DB when called without a body.

## 4. Database & API Design Decisions
- **Alembic Migration (`2a8f4c1e9b01_add_scale_and_override_to_business_profiles.py`):**
  - Revises `1dda096b9349`.
  - Adds `business_scale` (`sa.String(length=20)`, `nullable=False`, `server_default="mikro"`) and `is_manual_override` (`sa.Boolean()`, `nullable=False`, `server_default=sa.text("false")`) to `business_profiles`.
- **Endpoints (`/api/v1/*`):**
  - `POST /api/v1/profiler/match` → `ProfilerMatchRequest` → `ProfilerMatchResponse`
  - `POST /api/v1/business-profile` & `GET /api/v1/business-profile` → `BusinessProfileUpsertRequest` → `BusinessProfileResponse`
  - `POST /api/v1/compliance/checklist` → `ChecklistRequest | None` → `ChecklistResponse` (includes both flat `obligations` array for `frontend/lib/compliance.ts` and `tracks` map with `track_status: "ready" | "coming_soon"`)
  - `POST /api/v1/chat/ask` → `ChatAskRequest` → `ChatAskResponse`
  - `POST /api/v1/documents/generate`, `GET /api/v1/documents`, `GET /api/v1/documents/download-zip` → `DocumentListResponse` / `application/zip`

