"""Ingest data/obligations_oss.csv into `obligations` and `regulation_chunks`.

Run from the backend folder:
    cd G:\\Legalyst\\backend
    python scripts\\ingest_regulations.py

Safe to re-run: obligations are upserted by obligation_id, and chunks are
deleted and re-inserted per obligation.
"""
import csv
import math
import os
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def load_env(path):
    """Minimal .env reader (no extra package needed)."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env(REPO_ROOT / ".env")

from sqlalchemy import create_engine, delete, func, select, text  # noqa: E402
from sqlalchemy.dialects.postgresql import insert as pg_insert  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.models import Base, Obligation, RegulationChunk  # noqa: E402

CSV_PATH = REPO_ROOT / "data" / "obligations_oss.csv"


def get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set. Add it to G:\\Legalyst\\.env")
    return create_engine(url)


def embed(texts, task_type="RETRIEVAL_DOCUMENT", batch_size=20):
    """gemini-embedding-001, 1536 dims, L2-normalized, batched, retry on 429."""
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        sys.exit("GEMINI_API_KEY is not set. Add it to G:\\Legalyst\\.env")
    client = genai.Client(api_key=api_key)
    model = os.environ.get("GEMINI_EMBED_MODEL", "gemini-embedding-001")
    dim = int(os.environ.get("GEMINI_EMBED_DIM", "1536"))

    vectors = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        for attempt in range(6):
            try:
                res = client.models.embed_content(
                    model=model,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type=task_type, output_dimensionality=dim
                    ),
                )
                break
            except Exception as e:
                rate_limited = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
                if attempt == 5 or not rate_limited:
                    raise
                time.sleep(2 * 2**attempt)
        for emb in res.embeddings:
            v = emb.values
            norm = math.sqrt(sum(x * x for x in v))
            vectors.append([x / norm for x in v])
        time.sleep(1)
    return vectors


def clean(value):
    value = (value or "").strip()
    return value or None


def build_chunk_text(row):
    scope = row["kbli_scope"].strip()
    scope_text = "semua KBLI" if scope == "ALL" else f"KBLI {scope}"
    parts = [
        f"Kewajiban {row['obligation_id']} (jalur {row['track']}).",
        f"Berlaku untuk: {scope_text}.",
        f"Skala usaha: {row['business_scale']}.",
        f"Tingkat risiko: {row['risk_tier']}.",
        f"Persyaratan: {row['requirement_text']}",
        f"Instansi penerbit: {row['issuing_agency']}.",
        f"Dasar hukum: {row['source_article']}.",
    ]
    return "\n".join(parts)


def main():
    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    print(f"Read {len(rows)} rows from {CSV_PATH.name}")

    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(engine)

    # 1. Upsert obligations
    with Session(engine) as session:
        for row in rows:
            values = {
                "obligation_id": row["obligation_id"].strip(),
                "track": row["track"].strip(),
                "kbli_scope": row["kbli_scope"].strip(),
                "business_scale": row["business_scale"].strip(),
                "risk_tier": clean(row["risk_tier"]),
                "requirement_text": row["requirement_text"].strip(),
                "issuing_agency": row["issuing_agency"].strip(),
                "source_url": row["source_url"].strip(),
                "source_article": clean(row["source_article"]),
                "notes": clean(row["notes"]),
            }
            stmt = pg_insert(Obligation).values(**values)
            stmt = stmt.on_conflict_do_update(
                index_elements=["obligation_id"],
                set_={k: v for k, v in values.items() if k != "obligation_id"},
            )
            session.execute(stmt)
        session.commit()
    print("Obligations upserted.")

    # 2. Build chunks and embed them (one chunk per obligation)
    texts = [build_chunk_text(r) for r in rows]
    print(f"Embedding {len(texts)} chunks with Gemini...")
    vectors = embed(texts, task_type="RETRIEVAL_DOCUMENT")
    print(f"Got {len(vectors)} vectors, dimension {len(vectors[0])}")

    # 3. Replace chunks (source = obligation_id, so we can join back later)
    ids = [r["obligation_id"].strip() for r in rows]
    with Session(engine) as session:
        session.execute(delete(RegulationChunk).where(RegulationChunk.source.in_(ids)))
        for oid, content, vec in zip(ids, texts, vectors):
            session.add(RegulationChunk(source=oid, content=content, embedding=vec))
        session.commit()

        n_obl = session.scalar(select(func.count()).select_from(Obligation))
        n_chunks = session.scalar(select(func.count()).select_from(RegulationChunk))
    print(f"Done. obligations={n_obl}, regulation_chunks={n_chunks}")


if __name__ == "__main__":
    main()