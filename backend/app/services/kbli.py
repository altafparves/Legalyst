"""KBLI 2025 codebook loader, validator, and risk-tier resolver (#77, #83)."""

import csv
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.schemas import RiskTier

REPO_ROOT = Path(__file__).resolve().parents[3]
KBLI_CSV_PATH = REPO_ROOT / "data" / "kbli_2025.csv"
OSS_OBLIGATIONS_CSV_PATH = REPO_ROOT / "data" / "obligations_oss.csv"


@dataclass(frozen=True)
class KbliEntry:
    kode: str
    judul: str
    deskripsi: str
    kategori: str
    sumber_url: str
    default_risk_tier: RiskTier


@lru_cache(maxsize=1)
def _load_risk_tier_map() -> dict[str, RiskTier]:
    """Derive the default micro/small OSS-RBA risk tier per KBLI from data/obligations_oss.csv."""
    tier_map: dict[str, RiskTier] = {}
    if not OSS_OBLIGATIONS_CSV_PATH.exists():
        return tier_map

    valid_tiers: set[str] = {"rendah", "menengah rendah", "menengah tinggi", "tinggi"}
    with open(OSS_OBLIGATIONS_CSV_PATH, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            scope = (row.get("kbli_scope") or "").strip()
            tier = (row.get("risk_tier") or "").strip().lower()
            if scope == "ALL" or tier not in valid_tiers:
                continue
            for code in (c.strip() for c in scope.split(",") if c.strip()):
                if code not in tier_map:
                    tier_map[code] = tier  # type: ignore[assignment]
    return tier_map


@lru_cache(maxsize=1)
def load_kbli_catalog() -> dict[str, KbliEntry]:
    """Load all 313 5-digit KBLI 2025 entries from data/kbli_2025.csv keyed by 5-digit code."""
    catalog: dict[str, KbliEntry] = {}
    risk_map = _load_risk_tier_map()

    with open(KBLI_CSV_PATH, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            kode = row["kode"].strip()
            catalog[kode] = KbliEntry(
                kode=kode,
                judul=row["judul"].strip(),
                deskripsi=row["deskripsi"].strip(),
                kategori=row.get("kategori", "").strip(),
                sumber_url=row.get("sumber_url", "").strip(),
                default_risk_tier=risk_map.get(kode, "rendah"),
            )
    return catalog


def get_kbli_entry(kbli_code: str) -> KbliEntry | None:
    """Return the KbliEntry for a 5-digit KBLI 2025 code, or None if not in the codebook."""
    return load_kbli_catalog().get(kbli_code.strip())
