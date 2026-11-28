"""Rule Engine & Grounded RAG Compliance Checklist + Q&A service (#83, #68, #63).

Enforces the Day 8 (Fri 28 Nov) data cutoff rule (#83):
Tracks (`OSS`, `PIRT`, `HALAL`, `SPT`) without ingested rows in `obligations`
return `track_status="coming_soon"` so the UI and RAG chat never hallucinate
missing regulations.

AI helpers (Gemini embeddings + Google AI Studio / OpenRouter grounded LLM
synthesis) are kept local to this module for #68 so Calvin's #86/#87 work stays
isolated and conflict-free.
"""

from __future__ import annotations

import csv
import hashlib
import json
import logging
import math
import os
import time
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Obligation, RegulationChunk
from app.schemas import (
    LEGAL_DISCLAIMER_ID,
    BusinessScale,
    ChatAskResponse,
    ChatCitation,
    ChecklistItem,
    ChecklistResponse,
    ObligationTrack,
    RiskTier,
    TrackChecklistGroup,
)
from app.services.kbli import get_kbli_entry

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
OSS_CSV_PATH = REPO_ROOT / "data" / "obligations_oss.csv"
ALL_TRACKS: tuple[ObligationTrack, ...] = ("OSS", "PIRT", "HALAL", "SPT")

_CHECKLIST_CACHE_TTL_SECONDS = 1800.0
_CHECKLIST_SYNTHESIS_CACHE: dict[str, tuple[float, dict[str, dict[str, str]]]] = {}


def clear_checklist_cache() -> None:
    """Clear the in-memory checklist synthesis TTL cache (used in tests)."""
    _CHECKLIST_SYNTHESIS_CACHE.clear()


def _load_fallback_oss_rows() -> list[dict[str, str]]:
    if not OSS_CSV_PATH.exists():
        return []
    with open(OSS_CSV_PATH, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _scope_matches(kbli_scope: str, kbli_code: str) -> bool:
    scope = kbli_scope.strip().upper()
    if scope == "ALL":
        return True
    codes = {c.strip() for c in kbli_scope.split(",") if c.strip()}
    return kbli_code in codes


def _scale_matches(scope_scale: str, business_scale: BusinessScale) -> bool:
    raw = scope_scale.strip().lower()
    if not raw or raw == "all":
        return True
    scales = {s.strip() for s in raw.split(",") if s.strip()}
    return business_scale in scales


def _risk_tier_matches(kbli_scope: str, scope_risk: str, target_risk: RiskTier) -> bool:
    """Match obligation risk_tier against the KBLI's risk tier.

    Universal obligations (`kbli_scope == "ALL"`, e.g. KKPR, BPJS/WLKP, LKPM)
    apply across all risk tiers regardless of the CSV default `risk_tier` value.
    """
    if kbli_scope.strip().upper() == "ALL":
        return True
    raw = scope_risk.strip().lower()
    if not raw or raw == "all":
        return True
    tiers = {t.strip() for t in raw.split(",") if t.strip()}
    return target_risk.lower() in tiers


def _derive_title(obligation_id: str, track: str, requirement_text: str) -> str:
    first_sentence = requirement_text.split(".")[0].strip()
    if len(first_sentence) <= 75:
        return first_sentence
    return f"Kewajiban {obligation_id} ({track})"


def _needs_manual_verification(notes: str | None, requirement_text: str) -> bool:
    text_blob = f"{notes or ''} {requirement_text}".lower()
    triggers = ("apabila", "jika", "tergantung", "verifikasi", "daerah", "dikecualikan")
    return any(t in text_blob for t in triggers)


# ---------------------------------------------------------------------------
# Local Embedding & pgvector Retrieval Helpers (#68 FR 5)
# ---------------------------------------------------------------------------


def _embed_query_gemini(text: str) -> list[float] | None:
    """Embed a query via Google AI Studio gemini-embedding-001 (1536-d, L2-normalized)."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    model = os.environ.get("GEMINI_EMBED_MODEL", "gemini-embedding-001").strip() or (
        "gemini-embedding-001"
    )
    dim = int(os.environ.get("GEMINI_EMBED_DIM", "1536"))

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        for attempt in range(2):
            try:
                res = client.models.embed_content(
                    model=model,
                    contents=[text],
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_QUERY",
                        output_dimensionality=dim,
                    ),
                )
                vec = list(res.embeddings[0].values)
                norm = math.sqrt(sum(x * x for x in vec)) or 1.0
                return [x / norm for x in vec]
            except Exception as exc:
                msg = str(exc)
                if ("429" in msg or "RESOURCE_EXHAUSTED" in msg) and attempt == 0:
                    time.sleep(1.0)
                    continue
                raise
    except Exception as exc:
        logger.warning("Gemini query embedding failed; skipping vector retrieval: %s", exc)
        return None
    return None


def _retrieve_regulation_chunks(
    db: Session,
    query_text: str,
    limit: int = 5,
) -> list[dict[str, str]]:
    """Retrieve Top-K regulation chunks via pgvector cosine distance (<=>)."""
    try:
        bind = db.get_bind()
        if bind is None or bind.dialect.name != "postgresql":
            return []
    except Exception:
        return []

    qvec = _embed_query_gemini(query_text)
    if qvec is None:
        return []

    try:
        distance = RegulationChunk.embedding.cosine_distance(qvec).label("distance")
        stmt = (
            select(
                RegulationChunk.source,
                RegulationChunk.content,
                Obligation.source_article,
                Obligation.source_url,
                distance,
            )
            .join(Obligation, Obligation.obligation_id == RegulationChunk.source)
            .order_by(distance)
            .limit(limit)
        )
        rows = db.execute(stmt).all()
        return [
            {
                "obligation_id": str(row.source),
                "content": str(row.content),
                "source_article": str(row.source_article),
                "source_url": str(row.source_url),
            }
            for row in rows
        ]
    except Exception as exc:
        logger.warning("pgvector chunk retrieval failed; continuing with rule engine rows: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Local Grounded LLM Helpers (#68 FR 6 — Google AI Studio + OpenRouter Ready)
# ---------------------------------------------------------------------------


def _extract_json_object(raw_text: str) -> dict[str, Any] | None:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end > start:
            try:
                parsed = json.loads(cleaned[start : end + 1])
                return parsed if isinstance(parsed, dict) else None
            except json.JSONDecodeError:
                return None
        return None


def _call_gemini_json(
    system_prompt: str,
    user_prompt: str,
    *,
    model: str,
    api_key: str,
    timeout_s: float,
) -> str | None:
    from google import genai
    from google.genai import types

    timeout_ms = max(int(timeout_s * 1000), 1000)
    client = genai.Client(api_key=api_key, http_options={"timeout": timeout_ms})
    response = client.models.generate_content(
        model=model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    return getattr(response, "text", None)


def _call_openrouter_json(
    system_prompt: str,
    user_prompt: str,
    *,
    model: str,
    base_url: str,
    api_key: str,
    timeout_s: float,
) -> str | None:
    endpoint = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://legalyst-frontend.vercel.app",
        "X-Title": "Legalyst Compliance Copilot",
    }
    payload = {
        "model": model,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    res = httpx.post(endpoint, headers=headers, json=payload, timeout=timeout_s)
    res.raise_for_status()
    data = res.json()
    choices = data.get("choices") or []
    if not choices:
        return None
    return choices[0].get("message", {}).get("content")


def _generate_grounded_json(system_prompt: str, user_prompt: str) -> dict[str, Any] | None:
    """Call configured LLM provider with automatic fallback chain and latency cap."""
    provider = os.environ.get("LLM_PROVIDER", "gemini").strip().lower() or "gemini"
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    gemini_primary = os.environ.get("GEMINI_CHAT_MODEL", "gemini-2.5-flash").strip() or (
        "gemini-2.5-flash"
    )
    gemini_fallback = os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite").strip() or (
        "gemini-2.5-flash-lite"
    )
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    openrouter_base = os.environ.get(
        "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
    ).strip() or "https://openrouter.ai/api/v1"
    openrouter_model = os.environ.get("OPENROUTER_MODEL", "google/gemini-2.5-flash").strip() or (
        "google/gemini-2.5-flash"
    )
    total_timeout = float(os.environ.get("LLM_TIMEOUT_SECONDS", "8.0"))

    if provider == "openrouter":
        attempts: list[tuple[str, str]] = [
            ("openrouter", openrouter_model),
            ("gemini", gemini_primary),
            ("gemini", gemini_fallback),
        ]
    else:
        attempts = [
            ("gemini", gemini_primary),
            ("gemini", gemini_fallback),
            ("openrouter", openrouter_model),
        ]

    seen: set[tuple[str, str]] = set()
    deadline = time.monotonic() + max(total_timeout, 1.0)

    for prov, model in attempts:
        if (prov, model) in seen:
            continue
        seen.add((prov, model))

        remaining = deadline - time.monotonic()
        if remaining <= 0.2:
            break

        if prov == "gemini" and not gemini_key:
            continue
        if prov == "openrouter" and not openrouter_key:
            continue

        try:
            if prov == "gemini":
                raw = _call_gemini_json(
                    system_prompt,
                    user_prompt,
                    model=model,
                    api_key=gemini_key,
                    timeout_s=remaining,
                )
            else:
                raw = _call_openrouter_json(
                    system_prompt,
                    user_prompt,
                    model=model,
                    base_url=openrouter_base,
                    api_key=openrouter_key,
                    timeout_s=remaining,
                )
            if not raw:
                continue
            parsed = _extract_json_object(raw)
            if parsed is not None:
                return parsed
        except Exception as exc:
            logger.warning("LLM provider=%s model=%s failed: %s", prov, model, exc)
            continue

    return None


def _build_cache_key(
    kbli_code: str,
    business_scale: BusinessScale,
    risk_tier: RiskTier,
    obligation_ids: list[str],
    description: str | None,
) -> str:
    norm_desc = " ".join((description or "").lower().split())
    raw = f"{kbli_code}|{business_scale}|{risk_tier}|{','.join(sorted(obligation_ids))}|{norm_desc}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _apply_synthesized_map(
    items: list[ChecklistItem],
    synthesized: dict[str, dict[str, str]],
) -> list[ChecklistItem]:
    enriched: list[ChecklistItem] = []
    for item in items:
        override = synthesized.get(item.obligation_id)
        if isinstance(override, dict):
            new_title = str(override.get("title") or "").strip()
            new_req = str(override.get("requirement_text") or "").strip()
            enriched.append(
                item.model_copy(
                    update={
                        "title": new_title[:90] if new_title else item.title,
                        "requirement_text": new_req if new_req else item.requirement_text,
                    }
                )
            )
        else:
            enriched.append(item)
    return enriched


def _synthesize_checklist_items(
    *,
    kbli_code: str,
    kbli_title: str,
    business_scale: BusinessScale,
    risk_tier: RiskTier,
    description: str | None,
    items: list[ChecklistItem],
    retrieved_chunks: list[dict[str, str]],
) -> list[ChecklistItem]:
    """Synthesize plain-language Indonesian summaries in 1 batched LLM call (FR 6)."""
    if not items:
        return items

    cache_key = _build_cache_key(
        kbli_code=kbli_code,
        business_scale=business_scale,
        risk_tier=risk_tier,
        obligation_ids=[i.obligation_id for i in items],
        description=description,
    )
    now = time.monotonic()
    cached = _CHECKLIST_SYNTHESIS_CACHE.get(cache_key)
    if cached is not None:
        expires_at, cached_map = cached
        if now < expires_at:
            return _apply_synthesized_map(items, cached_map)
        _CHECKLIST_SYNTHESIS_CACHE.pop(cache_key, None)

    system_prompt = (
        "Anda adalah asisten kepatuhan regulasi UMKM Indonesia (Legalyst). "
        "Tugas Anda menyederhanakan daftar kewajiban hukum yang diberikan menjadi bahasa Indonesia "
        "yang jelas, praktis, dan mudah dipahami pemilik UMKM.\n"
        "ATURAN KETAT:\n"
        "1. HANYA gunakan fakta dari daftar kewajiban dan kutipan regulasi yang diberikan.\n"
        "2. DILARANG menambah kewajiban baru, menghapus obligation_id, atau mengarang pasal/tautan.\n"
        "3. Untuk setiap obligation_id, buat 'title' singkat (maksimal 70 karakter) dan "
        "'requirement_text' ringkas (1-2 kalimat lugas) dalam Bahasa Indonesia.\n"
        "4. Balas HANYA dengan JSON valid berbentuk: "
        '{"items": {"OSS-001": {"title": "...", "requirement_text": "..."}, ...}}.'
    )

    obligations_payload = [
        {
            "obligation_id": item.obligation_id,
            "track": item.track,
            "requirement_text": item.requirement_text,
            "issuing_agency": item.issuing_agency,
            "source_article": item.source_article,
            "notes": item.notes or "",
        }
        for item in items
    ]
    user_payload: dict[str, Any] = {
        "business_context": {
            "kbli_code": kbli_code,
            "kbli_title": kbli_title,
            "business_scale": business_scale,
            "risk_tier": risk_tier,
            "description": description or "",
        },
        "obligations": obligations_payload,
    }
    if retrieved_chunks:
        user_payload["retrieved_regulation_chunks"] = [
            {
                "obligation_id": c["obligation_id"],
                "source_article": c["source_article"],
                "content": c["content"][:500],
            }
            for c in retrieved_chunks
        ]

    parsed = _generate_grounded_json(
        system_prompt=system_prompt,
        user_prompt=json.dumps(user_payload, ensure_ascii=False),
    )
    if not parsed or not isinstance(parsed.get("items"), dict):
        return items

    synthesized_map: dict[str, dict[str, str]] = {}
    valid_ids = {i.obligation_id for i in items}
    for ob_id, val in parsed["items"].items():
        if ob_id in valid_ids and isinstance(val, dict):
            synthesized_map[ob_id] = {
                "title": str(val.get("title") or "").strip(),
                "requirement_text": str(val.get("requirement_text") or "").strip(),
            }

    if not synthesized_map:
        return items

    _CHECKLIST_SYNTHESIS_CACHE[cache_key] = (
        now + _CHECKLIST_CACHE_TTL_SECONDS,
        synthesized_map,
    )
    return _apply_synthesized_map(items, synthesized_map)


# ---------------------------------------------------------------------------
# Public Compliance Services
# ---------------------------------------------------------------------------


def generate_checklist(
    db: Session,
    kbli_code: str,
    business_scale: BusinessScale = "mikro",
    description: str | None = None,
) -> ChecklistResponse:
    """Rule engine filtering + pgvector retrieval + grounded LLM synthesis (FR 4 – FR 8, #68)."""
    kbli_entry = get_kbli_entry(kbli_code)
    kbli_title = kbli_entry.judul if kbli_entry else f"KBLI {kbli_code}"
    risk_tier: RiskTier = kbli_entry.default_risk_tier if kbli_entry else "rendah"

    try:
        db_rows = db.query(Obligation).all()
    except Exception:
        db_rows = []

    raw_rows: list[dict[str, str | None]] = []
    if db_rows:
        for r in db_rows:
            raw_rows.append(
                {
                    "obligation_id": r.obligation_id,
                    "track": r.track,
                    "kbli_scope": r.kbli_scope,
                    "business_scale": r.business_scale,
                    "risk_tier": r.risk_tier,
                    "requirement_text": r.requirement_text,
                    "issuing_agency": r.issuing_agency,
                    "source_url": r.source_url,
                    "source_article": r.source_article,
                    "notes": r.notes,
                }
            )
    else:
        for r in _load_fallback_oss_rows():
            raw_rows.append(r)

    ingested_tracks = {str(r.get("track") or "").strip().upper() for r in raw_rows}
    tracks_map: dict[ObligationTrack, TrackChecklistGroup] = {
        track: TrackChecklistGroup(
            track=track,
            track_status="ready" if track in ingested_tracks else "coming_soon",
            items=[],
        )
        for track in ALL_TRACKS
    }

    matched_items: list[ChecklistItem] = []
    for r in raw_rows:
        track_raw = str(r.get("track") or "OSS").strip().upper()
        if track_raw not in ALL_TRACKS:
            continue
        track: ObligationTrack = track_raw  # type: ignore[assignment]
        kbli_scope = str(r.get("kbli_scope") or "")
        scale_scope = str(r.get("business_scale") or "")
        row_risk = str(r.get("risk_tier") or "")

        if not _scope_matches(kbli_scope, kbli_code):
            continue
        if not _scale_matches(scale_scope, business_scale):
            continue
        if not _risk_tier_matches(kbli_scope, row_risk, risk_tier):
            continue

        obligation_id = str(r.get("obligation_id") or "")
        req_text = str(r.get("requirement_text") or "")
        article = str(r.get("source_article") or "Regulasi Terkait").strip()
        notes = r.get("notes")

        item = ChecklistItem(
            obligation_id=obligation_id,
            track=track,
            title=_derive_title(obligation_id, track, req_text),
            requirement_text=req_text,
            issuing_agency=str(r.get("issuing_agency") or ""),
            citation=article,
            source_article=article,
            source_url=str(r.get("source_url") or ""),
            needs_manual_verification=_needs_manual_verification(notes, req_text),
            notes=notes,
        )
        matched_items.append(item)

    # FR 5: Vector retrieval against pgvector (gracefully returns [] on SQLite / no API key)
    query_text = (
        f"KBLI {kbli_code} {kbli_title} skala {business_scale} risiko {risk_tier}. "
        f"{description or ''}"
    ).strip()
    retrieved_chunks = _retrieve_regulation_chunks(db=db, query_text=query_text, limit=5)

    # FR 6: Batched grounded Indonesian synthesis with TTL cache + deterministic fallback
    synthesized_items = _synthesize_checklist_items(
        kbli_code=kbli_code,
        kbli_title=kbli_title,
        business_scale=business_scale,
        risk_tier=risk_tier,
        description=description,
        items=matched_items,
        retrieved_chunks=retrieved_chunks,
    )

    for item in synthesized_items:
        tracks_map[item.track].items.append(item)

    return ChecklistResponse(
        kbli_code=kbli_code,
        kbli_title=kbli_title,
        business_scale=business_scale,
        risk_tier=risk_tier,
        obligations=synthesized_items,
        tracks=tracks_map,
        disclaimer=LEGAL_DISCLAIMER_ID,
    )


def answer_compliance_question(
    db: Session,
    question: str,
    kbli_code: str | None = None,
) -> ChatAskResponse:
    """Grounded RAG Q&A service signature for Calvin (#83, #63 Phase 5)."""
    target_kbli = kbli_code or "10794"
    checklist = generate_checklist(db=db, kbli_code=target_kbli)
    top_items = checklist.obligations[:3]

    citations = [
        ChatCitation(
            obligation_id=item.obligation_id,
            source_article=item.source_article,
            source_url=item.source_url,
        )
        for item in top_items
    ]

    if top_items:
        bullet_lines = [
            f"- [{item.obligation_id}] {item.requirement_text} (Dasar hukum: {item.source_article})"
            for item in top_items
        ]
        answer = (
            f"Berdasarkan korpus regulasi untuk KBLI {checklist.kbli_code} "
            f"({checklist.kbli_title}, risiko {checklist.risk_tier}):\n"
            + "\n".join(bullet_lines)
        )
    else:
        answer = (
            "Belum ditemukan klausa regulasi spesifik di korpus yang ter-ingest untuk pertanyaan ini. "
            "Silakan periksa kembali kode KBLI atau portal resmi OSS-RBA."
        )

    return ChatAskResponse(
        answer=answer,
        citations=citations,
        disclaimer=LEGAL_DISCLAIMER_ID,
    )
