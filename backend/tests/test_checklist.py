"""Unit & integration tests for Rule Engine & Grounded RAG Compliance Checklist (#68)."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.db import Base
from app.main import app
from app.models import BusinessProfile, GeneratedDocument, Obligation, User
from app.services import compliance
from tests.test_auth import engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_tables_and_cache(monkeypatch: pytest.MonkeyPatch):
    tables = [
        User.__table__,
        BusinessProfile.__table__,
        Obligation.__table__,
        GeneratedDocument.__table__,
    ]
    Base.metadata.create_all(bind=engine, tables=tables)
    compliance.clear_checklist_cache()
    # Ensure CI / tests never hit live external APIs by default
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    yield
    compliance.clear_checklist_cache()
    Base.metadata.drop_all(bind=engine, tables=tables)


def _get_auth_headers(email: str = "checklist@umkm.id", password: str = "password123") -> dict[str, str]:
    client.post("/auth/register", json={"email": email, "password": password})
    login_res = client.post("/auth/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_checklist_rule_engine_filters_kbli_scale_and_risk_tier():
    """FR 4: Filters by kbli_scope, business_scale, risk_tier, and sets Day 8 track_status."""
    # 10794 (Keripik) is risk_tier='rendah'; mikro should include OSS-013 (mikro) and exclude OSS-012 (kecil)
    res_mikro = client.post(
        "/api/v1/compliance/checklist",
        json={"kbli": "10794", "business_scale": "mikro", "description": "Keripik pisang rumahan"},
    )
    assert res_mikro.status_code == 200
    body = res_mikro.json()
    assert body["kbli_code"] == "10794"
    assert body["business_scale"] == "mikro"
    assert body["risk_tier"] == "rendah"

    ids_mikro = {item["obligation_id"] for item in body["obligations"]}
    assert "OSS-001" in ids_mikro  # NIB rendah
    assert "OSS-010" in ids_mikro  # Universal KKPR (kbli_scope=ALL)
    assert "OSS-013" in ids_mikro  # Mikro LKPM exemption
    assert "OSS-012" not in ids_mikro  # Kecil LKPM only
    assert "OSS-004" not in ids_mikro  # Menengah rendah only

    # Day 8 cutoff rule
    assert body["tracks"]["OSS"]["track_status"] == "ready"
    assert body["tracks"]["PIRT"]["track_status"] == "coming_soon"
    assert body["tracks"]["HALAL"]["track_status"] == "coming_soon"
    assert body["tracks"]["SPT"]["track_status"] == "coming_soon"

    # 56101 (Restoran/Warung Makan) defaults to 'menengah rendah' -> should NOT mix in 'menengah tinggi' OSS-006
    res_resto = client.post(
        "/api/v1/compliance/checklist",
        json={"kbli": "56101", "business_scale": "kecil"},
    )
    assert res_resto.status_code == 200
    resto_ids = {item["obligation_id"] for item in res_resto.json()["obligations"]}
    assert "OSS-004" in resto_ids  # Menengah rendah NIB + Sertifikat Standar
    assert "OSS-012" in resto_ids  # Kecil LKPM
    assert "OSS-013" not in resto_ids  # Mikro exemption
    assert "OSS-006" not in resto_ids  # Menengah tinggi excluded


def test_checklist_citations_and_manual_verification_flags():
    """FR 7 & FR 8: 100% source citations and manual verification flag preserved."""
    res = client.post(
        "/api/v1/compliance/checklist",
        json={"kbli": "10794", "business_scale": "mikro"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["disclaimer"]
    assert len(body["obligations"]) > 0

    for item in body["obligations"]:
        assert item["obligation_id"]
        assert item["track"] == "OSS"
        assert item["title"]
        assert item["requirement_text"]
        assert item["issuing_agency"]
        assert item["citation"] == item["source_article"]
        assert item["source_article"]
        assert item["source_url"].startswith("https://")
        assert isinstance(item["needs_manual_verification"], bool)

    # OSS-010 notes contain "apabila" -> must be flagged needs_manual_verification=True
    oss_010 = next(i for i in body["obligations"] if i["obligation_id"] == "OSS-010")
    assert oss_010["needs_manual_verification"] is True


def test_checklist_reads_saved_business_profile_when_body_omitted():
    headers = _get_auth_headers()
    client.post(
        "/api/v1/business-profile",
        json={
            "business_name": "Katering Bu Ani",
            "description": "Katering nasi kotak rumahan untuk acara kantor dan arisan.",
            "kbli_code": "56210",
            "business_scale": "mikro",
        },
        headers=headers,
    )

    res = client.post("/api/v1/compliance/checklist", headers=headers)
    assert res.status_code == 200
    assert res.json()["kbli_code"] == "56210"
    assert res.json()["business_scale"] == "mikro"


def test_checklist_grounded_llm_synthesis_and_ttl_cache(monkeypatch: pytest.MonkeyPatch):
    """FR 6: Mocked LLM enriches title/text while preserving citations & caching identical calls."""
    call_count = 0

    def fake_generate(system_prompt: str, user_prompt: str):
        nonlocal call_count
        call_count += 1
        return {
            "items": {
                "OSS-001": {
                    "title": "Daftar NIB Gratis di OSS-RBA",
                    "requirement_text": "Daftarkan usaha Anda di portal OSS untuk mendapatkan NIB sebagai izin resmi utama.",
                },
                "HALLUCINATED-999": {
                    "title": "Izin Palsu",
                    "requirement_text": "Tidak boleh muncul di output.",
                },
            }
        }

    monkeypatch.setattr(compliance, "_generate_grounded_json", fake_generate)

    payload = {
        "kbli": "10794",
        "business_scale": "mikro",
        "description": "Produksi keripik pisang rumahan",
    }
    res1 = client.post("/api/v1/compliance/checklist", json=payload)
    assert res1.status_code == 200
    items1 = res1.json()["obligations"]
    ids1 = {i["obligation_id"] for i in items1}
    assert "HALLUCINATED-999" not in ids1

    oss_001 = next(i for i in items1 if i["obligation_id"] == "OSS-001")
    assert oss_001["title"] == "Daftar NIB Gratis di OSS-RBA"
    assert "portal OSS" in oss_001["requirement_text"]
    assert "PP No. 5 Tahun 2021" in oss_001["source_article"]
    assert oss_001["source_url"].startswith("https://")
    assert call_count == 1

    # Second identical call hits in-memory TTL cache -> 0 additional LLM calls
    res2 = client.post("/api/v1/compliance/checklist", json=payload)
    assert res2.status_code == 200
    assert call_count == 1


def test_llm_fallback_chain_gemini_429_to_secondary_model(monkeypatch: pytest.MonkeyPatch):
    """When primary Gemini model hits 429, automatically falls back to GEMINI_FALLBACK_MODEL."""
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "fake-gemini-key")
    monkeypatch.setenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")
    monkeypatch.setenv("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite")

    called_models: list[str] = []

    def fake_gemini(system_prompt, user_prompt, *, model, api_key, timeout_s):
        called_models.append(model)
        if model == "gemini-2.5-flash":
            raise RuntimeError("429 RESOURCE_EXHAUSTED")
        return json.dumps(
            {
                "items": {
                    "OSS-001": {
                        "title": "NIB via Flash-Lite Fallback",
                        "requirement_text": "Ringkasan dari model cadangan Gemini Flash-Lite.",
                    }
                }
            }
        )

    monkeypatch.setattr(compliance, "_call_gemini_json", fake_gemini)

    res = client.post(
        "/api/v1/compliance/checklist",
        json={"kbli": "10794", "business_scale": "mikro"},
    )
    assert res.status_code == 200
    assert called_models == ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
    oss_001 = next(i for i in res.json()["obligations"] if i["obligation_id"] == "OSS-001")
    assert oss_001["title"] == "NIB via Flash-Lite Fallback"


def test_llm_openrouter_provider_and_gemini_fallback(monkeypatch: pytest.MonkeyPatch):
    """When LLM_PROVIDER=openrouter, calls OpenRouter first and falls back to Gemini if it fails."""
    monkeypatch.setenv("LLM_PROVIDER", "openrouter")
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-or-key")
    monkeypatch.setenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
    monkeypatch.setenv("GEMINI_API_KEY", "fake-gemini-key")

    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        {
                            "items": {
                                "OSS-001": {
                                    "title": "NIB via OpenRouter",
                                    "requirement_text": "Ringkasan dari OpenRouter API.",
                                }
                            }
                        }
                    )
                }
            }
        ]
    }
    monkeypatch.setattr(compliance.httpx, "post", MagicMock(return_value=mock_response))

    res = client.post(
        "/api/v1/compliance/checklist",
        json={"kbli": "10794", "business_scale": "mikro"},
    )
    assert res.status_code == 200
    oss_001 = next(i for i in res.json()["obligations"] if i["obligation_id"] == "OSS-001")
    assert oss_001["title"] == "NIB via OpenRouter"


def test_llm_total_failure_falls_back_deterministically_without_500(
    monkeypatch: pytest.MonkeyPatch,
):
    """Even if both Gemini and OpenRouter raise errors, endpoint returns 200 with DB/CSV text."""
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "fake-gemini-key")
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake-or-key")

    def boom(*args, **kwargs):
        raise RuntimeError("Upstream timeout")

    monkeypatch.setattr(compliance, "_call_gemini_json", boom)
    monkeypatch.setattr(compliance, "_call_openrouter_json", boom)

    res = client.post(
        "/api/v1/compliance/checklist",
        json={"kbli": "10794", "business_scale": "mikro"},
    )
    assert res.status_code == 200
    assert len(res.json()["obligations"]) > 0
    oss_001 = next(i for i in res.json()["obligations"] if i["obligation_id"] == "OSS-001")
    assert "Nomor Induk Berusaha" in oss_001["requirement_text"]

