"""Unit and integration tests for Auto-Document PDF Generator, Supabase Storage & ZIP API (#69)."""

from __future__ import annotations

import io
from unittest.mock import MagicMock
import zipfile

import pytest
from fastapi.testclient import TestClient

from app.db import Base
from app.main import app
from app.models import BusinessProfile, GeneratedDocument, Obligation, User
from app.services.documents import DOCUMENT_CATALOG, render_document_pdf_bytes
from tests.test_auth import engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_tables():
    tables = [
        User.__table__,
        BusinessProfile.__table__,
        Obligation.__table__,
        GeneratedDocument.__table__,
    ]
    Base.metadata.create_all(bind=engine, tables=tables)
    yield
    Base.metadata.drop_all(bind=engine, tables=tables)


def get_auth_headers(email: str = "docuser@umkm.id", password: str = "password123") -> dict[str, str]:
    client.post("/auth/register", json={"email": email, "password": password})
    login_res = client.post("/auth/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def seed_business_profile(headers: dict[str, str], kbli_code: str = "10794") -> dict:
    res = client.post(
        "/api/v1/business-profile",
        json={
            "business_name": "Keripik Pisang Bu Siti",
            "description": "Saya memproduksi keripik pisang aneka rasa dari dapur rumah untuk toko oleh-oleh.",
            "kbli_code": kbli_code,
            "business_scale": "mikro",
        },
        headers=headers,
    )
    assert res.status_code == 200
    return res.json()


def test_documents_endpoints_require_authentication():
    assert client.post("/api/v1/documents/generate").status_code == 401
    assert client.get("/api/v1/documents").status_code == 401
    assert client.get("/api/v1/documents/download-zip").status_code == 401
    assert (
        client.get("/api/v1/documents/download/surat_pernyataan_mandiri_oss").status_code == 401
    )


def test_documents_endpoints_return_404_without_saved_business_profile():
    headers = get_auth_headers("noprofile@umkm.id")
    assert client.post("/api/v1/documents/generate", headers=headers).status_code == 404
    assert client.get("/api/v1/documents", headers=headers).status_code == 404
    assert client.get("/api/v1/documents/download-zip", headers=headers).status_code == 404
    assert (
        client.get(
            "/api/v1/documents/download/surat_pernyataan_mandiri_oss",
            headers=headers,
        ).status_code
        == 404
    )


def test_render_document_pdf_bytes_produces_valid_pdf_for_all_three_templates():
    dummy_profile = BusinessProfile(
        id=1,
        user_id=1,
        business_name="Keripik Pisang Bu Siti",
        description="Produksi keripik pisang skala mikro rumahan – aneka rasa.",
        kbli_code="10794",
        business_scale="mikro",
        risk_tier="rendah",
    )
    for doc_type in DOCUMENT_CATALOG:
        pdf_bytes = render_document_pdf_bytes(
            doc_type=doc_type,
            profile=dummy_profile,
            kbli_title="Industri Kerupuk, Keripik, Peyek dan Sejenisnya",
        )
        assert pdf_bytes.startswith(b"%PDF-1.")
        assert b"%%EOF" in pdf_bytes
        assert b"/FlateDecode" in pdf_bytes
        assert len(pdf_bytes) > 1500


def test_generate_list_and_download_single_pdf():
    headers = get_auth_headers("singlepdf@umkm.id")
    seed_business_profile(headers)

    gen_res = client.post("/api/v1/documents/generate", headers=headers)
    assert gen_res.status_code == 200
    body = gen_res.json()
    assert len(body["documents"]) == 3
    assert body["disclaimer"]

    # Idempotent re-generation & subset filtering
    sub_res = client.post(
        "/api/v1/documents/generate",
        json={"document_types": ["surat_ikrar_halal"]},
        headers=headers,
    )
    assert sub_res.status_code == 200
    assert len(sub_res.json()["documents"]) == 1
    assert sub_res.json()["documents"][0]["document_type"] == "surat_ikrar_halal"

    # Full list still has 3 records
    list_res = client.get("/api/v1/documents", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["documents"]) == 3

    # Download each generated document individually as a real PDF
    for doc in list_res.json()["documents"]:
        dl_res = client.get(doc["file_url"], headers=headers)
        assert dl_res.status_code == 200
        assert dl_res.headers["content-type"] == "application/pdf"
        assert dl_res.content.startswith(b"%PDF-1.")
        assert "attachment; filename=" in dl_res.headers["content-disposition"]


def test_download_zip_bundles_three_valid_pdfs():
    headers = get_auth_headers("zipbundle@umkm.id")
    seed_business_profile(headers, kbli_code="10794")

    zip_res = client.get("/api/v1/documents/download-zip", headers=headers)
    assert zip_res.status_code == 200
    assert zip_res.headers["content-type"] == "application/zip"
    assert 'filename="legalyst-dokumen-10794.zip"' in zip_res.headers["content-disposition"]

    with zipfile.ZipFile(io.BytesIO(zip_res.content), mode="r") as zf:
        names = set(zf.namelist())
        expected_names = {f"{doc_type}.pdf" for doc_type in DOCUMENT_CATALOG}
        assert names == expected_names
        for name in names:
            data = zf.read(name)
            assert data.startswith(b"%PDF-1.")
            assert len(data) > 500


def test_supabase_storage_upload_and_graceful_fallback(monkeypatch: pytest.MonkeyPatch):
    headers = get_auth_headers("supabase@umkm.id")
    seed_business_profile(headers)

    monkeypatch.setenv("SUPABASE_URL", "https://example-project.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    monkeypatch.setenv("SUPABASE_STORAGE_BUCKET", "generated-documents")

    calls: list[tuple[str, bytes, dict]] = []

    def fake_post(url: str, content: bytes, headers: dict, timeout: float):
        calls.append((url, content, headers))
        resp = MagicMock()
        resp.status_code = 200
        return resp

    monkeypatch.setattr("app.services.documents.httpx.post", fake_post)

    res = client.post("/api/v1/documents/generate", headers=headers)
    assert res.status_code == 200
    docs = res.json()["documents"]
    assert len(calls) == 3
    for url, content, req_headers in calls:
        assert "https://example-project.supabase.co/storage/v1/object/generated-documents/" in url
        assert content.startswith(b"%PDF-1.")
        assert req_headers["Content-Type"] == "application/pdf"
        assert req_headers["x-upsert"] == "true"

    for doc in docs:
        assert doc["file_url"].startswith(
            "https://example-project.supabase.co/storage/v1/object/public/generated-documents/"
        )

    # Verify graceful fallback when Supabase returns 500
    def failing_post(url: str, content: bytes, headers: dict, timeout: float):
        resp = MagicMock()
        resp.status_code = 500
        return resp

    monkeypatch.setattr("app.services.documents.httpx.post", failing_post)
    fallback_res = client.post("/api/v1/documents/generate", headers=headers)
    assert fallback_res.status_code == 200
    for doc in fallback_res.json()["documents"]:
        assert doc["file_url"].startswith("/api/v1/documents/download/")

