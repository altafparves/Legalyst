import pytest
from fastapi.testclient import TestClient

from app.db import Base
from app.main import app
from app.models import BusinessProfile, GeneratedDocument, Obligation, User
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


def get_auth_headers(email: str = "siti@umkm.id", password: str = "password123") -> dict[str, str]:
    client.post("/auth/register", json={"email": email, "password": password})
    login_res = client.post("/auth/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_business_profile_requires_authentication():
    get_res = client.get("/api/v1/business-profile")
    assert get_res.status_code == 401

    post_res = client.post(
        "/api/v1/business-profile",
        json={
            "business_name": "Keripik Pisang Bu Siti",
            "description": "Saya memproduksi keripik pisang aneka rasa dari dapur rumah.",
            "kbli_code": "10794",
        },
    )
    assert post_res.status_code == 401


def test_get_business_profile_returns_404_when_none_saved():
    headers = get_auth_headers("empty@umkm.id")
    res = client.get("/api/v1/business-profile", headers=headers)
    assert res.status_code == 404


def test_upsert_and_get_business_profile_with_valid_kbli():
    headers = get_auth_headers("keripik@umkm.id")
    payload = {
        "business_name": "Keripik Pisang Bu Siti",
        "description": "Saya memproduksi keripik pisang aneka rasa dari dapur rumah.",
        "kbli_code": "10794",
        "business_scale": "mikro",
        "is_manual_override": False,
    }
    post_res = client.post("/api/v1/business-profile", json=payload, headers=headers)
    assert post_res.status_code == 200
    body = post_res.json()
    assert body["business_name"] == "Keripik Pisang Bu Siti"
    assert body["kbli_code"] == "10794"
    assert "Kerupuk" in body["kbli_title"] or "Keripik" in body["kbli_title"]
    assert body["business_scale"] == "mikro"
    assert body["risk_tier"] == "rendah"
    assert body["is_manual_override"] is False

    # Update existing profile (manual override = True, scale = kecil, KBLI = 56101)
    update_payload = {
        "business_name": "Warung Makan Bu Siti",
        "description": "Saya membuka warung makan nasi padang dengan 15 kursi makan.",
        "kbli_code": "56101",
        "business_scale": "kecil",
        "is_manual_override": True,
    }
    put_res = client.post("/api/v1/business-profile", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["id"] == body["id"]
    assert updated["kbli_code"] == "56101"
    assert updated["business_scale"] == "kecil"
    assert updated["risk_tier"] == "menengah rendah"
    assert updated["is_manual_override"] is True

    # GET returns the updated profile
    get_res = client.get("/api/v1/business-profile", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["kbli_code"] == "56101"
    assert get_res.json()["business_scale"] == "kecil"
    assert get_res.json()["is_manual_override"] is True


def test_upsert_business_profile_rejects_unknown_kbli_code():
    headers = get_auth_headers("invalid@umkm.id")
    payload = {
        "business_name": "Usaha Fiktif",
        "description": "Deskripsi usaha minimal sepuluh karakter untuk validasi.",
        "kbli_code": "99999",
    }
    res = client.post("/api/v1/business-profile", json=payload, headers=headers)
    assert res.status_code == 422
    assert "99999" in res.json()["detail"]


def test_checklist_and_documents_fallback_to_saved_business_profile():
    headers = get_auth_headers("bridge@umkm.id")
    client.post(
        "/api/v1/business-profile",
        json={
            "business_name": "Keripik Pisang Bu Siti",
            "description": "Saya memproduksi keripik pisang aneka rasa dari dapur rumah.",
            "kbli_code": "10794",
            "business_scale": "mikro",
        },
        headers=headers,
    )

    # Call /api/v1/compliance/checklist with no body -> reads KBLI 10794 from saved profile (#77)
    chk_res = client.post("/api/v1/compliance/checklist", headers=headers)
    assert chk_res.status_code == 200
    chk_body = chk_res.json()
    assert chk_body["kbli_code"] == "10794"
    assert chk_body["business_scale"] == "mikro"
    assert len(chk_body["obligations"]) > 0
    assert chk_body["tracks"]["OSS"]["track_status"] == "ready"
    assert chk_body["tracks"]["PIRT"]["track_status"] == "coming_soon"
    assert chk_body["tracks"]["HALAL"]["track_status"] == "coming_soon"
    assert chk_body["tracks"]["SPT"]["track_status"] == "coming_soon"

    # Call /api/v1/documents/generate with no body -> uses saved profile (#77, #69)
    doc_res = client.post("/api/v1/documents/generate", headers=headers)
    assert doc_res.status_code == 200
    docs = doc_res.json()["documents"]
    assert len(docs) == 3

    list_res = client.get("/api/v1/documents", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["documents"]) == 3

    zip_res = client.get("/api/v1/documents/download-zip", headers=headers)
    assert zip_res.status_code == 200
    assert zip_res.headers["content-type"] == "application/zip"


def test_profiler_and_chat_v1_contracts():
    prof_res = client.post(
        "/api/v1/profiler/match",
        json={
            "description": "Saya memproduksi keripik pisang aneka rasa dari dapur rumah untuk dijual."
        },
    )
    assert prof_res.status_code == 200
    prof_body = prof_res.json()
    assert prof_body["kbli_version"] == "2025"
    assert len(prof_body["candidates"]) == 3
    assert all(len(c["kode"]) == 5 for c in prof_body["candidates"])

    chat_res = client.post(
        "/api/v1/chat/ask",
        json={
            "question": "Apa saja syarat izin NIB untuk usaha keripik skala mikro?",
            "kbli_code": "10794",
        },
    )
    assert chat_res.status_code == 200
    chat_body = chat_res.json()
    assert chat_body["answer"]
    assert len(chat_body["citations"]) > 0
    assert chat_body["disclaimer"]
