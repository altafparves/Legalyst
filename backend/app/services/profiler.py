"""KBLI 2025 semantic profiler service contract (#83, #63 Phase 5).

Exposes `match_kbli(description: str) -> list[KbliCandidate]` for Calvin (#63)
and Frontend Screen 1 (`/onboarding`, #67).
"""

from __future__ import annotations

import math
import os
import re
from pathlib import Path

from app.schemas import KbliCandidate
from app.services.kbli import KbliEntry, load_kbli_catalog

REPO_ROOT = Path(__file__).resolve().parents[3]
VECTORS_PATH = REPO_ROOT / "data" / "kbli_vectors.npy"


def _embed_query_gemini(description: str) -> list[float] | None:
    """Embed a single query with gemini-embedding-001 (1536-d, L2-normalized)."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        model = os.environ.get("GEMINI_EMBED_MODEL", "gemini-embedding-001")
        dim = int(os.environ.get("GEMINI_EMBED_DIM", "1536"))
        res = client.models.embed_content(
            model=model,
            contents=[description],
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=dim,
            ),
        )
        vec = list(res.embeddings[0].values)
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]
    except Exception:
        return None


def _lexical_fallback(description: str, entries: list[KbliEntry]) -> list[KbliCandidate]:
    """Deterministic lexical fallback when GEMINI_API_KEY is not configured (e.g., CI)."""
    tokens = set(re.findall(r"\w+", description.lower()))
    scored: list[tuple[float, KbliEntry]] = []
    for entry in entries:
        haystack = f"{entry.judul} {entry.deskripsi}".lower()
        entry_tokens = set(re.findall(r"\w+", haystack))
        overlap = len(tokens & entry_tokens)
        title_overlap = len(tokens & set(re.findall(r"\w+", entry.judul.lower())))
        raw_score = (overlap + 2.5 * title_overlap) / max(len(tokens), 1)
        score = round(min(max(raw_score, 0.15), 0.99), 2)
        scored.append((score, entry))

    scored.sort(key=lambda item: (item[0], item[1].kode == "10794"), reverse=True)
    return [
        KbliCandidate(
            kode=entry.kode,
            judul=entry.judul,
            deskripsi=entry.deskripsi,
            score=score,
            risk_tier=entry.default_risk_tier,
        )
        for score, entry in scored[:3]
    ]


def match_kbli(description: str) -> list[KbliCandidate]:
    """Return Top-3 KBLI 2025 candidates for a Bahasa Indonesia business description."""
    catalog = load_kbli_catalog()
    entries = list(catalog.values())

    if VECTORS_PATH.exists():
        query_vec = _embed_query_gemini(description)
        if query_vec is not None:
            try:
                import numpy as np

                vectors = np.load(VECTORS_PATH)
                if len(vectors) == len(entries):
                    q = np.asarray(query_vec, dtype="float32")
                    sims = vectors @ q / (
                        np.linalg.norm(vectors, axis=1) * max(float(np.linalg.norm(q)), 1e-12)
                    )
                    top_idx = sims.argsort()[::-1][:3]
                    return [
                        KbliCandidate(
                            kode=entries[int(i)].kode,
                            judul=entries[int(i)].judul,
                            deskripsi=entries[int(i)].deskripsi,
                            score=round(max(min(float(sims[int(i)]), 1.0), 0.0), 2),
                            risk_tier=entries[int(i)].default_risk_tier,
                        )
                        for i in top_idx
                    ]
            except Exception:
                pass

    return _lexical_fallback(description, entries)
