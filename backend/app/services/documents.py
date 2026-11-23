"""Auto-Document PDF generator service contract (#83, #69, #77)."""

from __future__ import annotations

import io
import zipfile

from sqlalchemy.orm import Session

from app.models import BusinessProfile, GeneratedDocument
from app.schemas import (
    LEGAL_DISCLAIMER_ID,
    DocumentListResponse,
    DocumentTypeLiteral,
    GeneratedDocumentItem,
)

DOCUMENT_CATALOG: dict[DocumentTypeLiteral, tuple[str, str]] = {
    "surat_pernyataan_mandiri_oss": (
        "Surat Pernyataan Mandiri Usaha Mikro (OSS-RBA)",
        "Standar BKPM / OSS-RBA",
    ),
    "komitmen_sanitasi_pirt": (
        "Formulir Komitmen Higienitas & Sanitasi P-IRT",
        "Standar Dinas Kesehatan",
    ),
    "surat_ikrar_halal": (
        "Surat Ikrar Bebas Bahan Kritis (Halal Self-Declare)",
        "Standar BPJPH Kemenag",
    ),
}


def generate_user_documents(
    db: Session,
    profile: BusinessProfile,
    document_types: list[DocumentTypeLiteral] | None = None,
) -> DocumentListResponse:
    """Create or refresh generated document records for the given BusinessProfile (#83, #69)."""
    target_types = document_types or list(DOCUMENT_CATALOG.keys())
    items: list[GeneratedDocumentItem] = []

    for doc_type in target_types:
        title, issuer = DOCUMENT_CATALOG[doc_type]
        existing = (
            db.query(GeneratedDocument)
            .filter(
                GeneratedDocument.business_profile_id == profile.id,
                GeneratedDocument.document_type == doc_type,
            )
            .first()
        )
        file_url = f"/api/v1/documents/download/{doc_type}?profile_id={profile.id}"
        if existing is None:
            existing = GeneratedDocument(
                business_profile_id=profile.id,
                document_type=doc_type,
                file_url=file_url,
                status="ready",
            )
            db.add(existing)
            db.flush()
        else:
            existing.file_url = file_url
            existing.status = "ready"
            db.flush()

        items.append(
            GeneratedDocumentItem(
                id=existing.id,
                business_profile_id=existing.business_profile_id,
                document_type=existing.document_type,
                title=title,
                issuer=issuer,
                status="ready",
                file_url=existing.file_url,
                created_at=existing.created_at,
            )
        )

    db.commit()
    return DocumentListResponse(documents=items, disclaimer=LEGAL_DISCLAIMER_ID)


def list_user_documents(db: Session, profile: BusinessProfile) -> DocumentListResponse:
    """List generated documents for the user's BusinessProfile (#83, #69)."""
    rows = (
        db.query(GeneratedDocument)
        .filter(GeneratedDocument.business_profile_id == profile.id)
        .order_by(GeneratedDocument.id.asc())
        .all()
    )
    items: list[GeneratedDocumentItem] = []
    for row in rows:
        doc_key: DocumentTypeLiteral = (
            row.document_type  # type: ignore[assignment]
            if row.document_type in DOCUMENT_CATALOG
            else "surat_pernyataan_mandiri_oss"
        )
        title, issuer = DOCUMENT_CATALOG[doc_key]
        status_val = row.status if row.status in {"pending", "ready", "failed"} else "ready"
        items.append(
            GeneratedDocumentItem(
                id=row.id,
                business_profile_id=row.business_profile_id,
                document_type=row.document_type,
                title=title,
                issuer=issuer,
                status=status_val,  # type: ignore[arg-type]
                file_url=row.file_url,
                created_at=row.created_at,
            )
        )
    return DocumentListResponse(documents=items, disclaimer=LEGAL_DISCLAIMER_ID)


def build_documents_zip_bytes(profile: BusinessProfile, kbli_title: str) -> bytes:
    """Bundle the 3 draft compliance documents into a valid in-memory .zip archive (#83, #69)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for doc_type, (title, issuer) in DOCUMENT_CATALOG.items():
            content = (
                f"{title}\n"
                f"Instansi: {issuer}\n"
                f"Nama Usaha: {profile.business_name}\n"
                f"Kode KBLI 2025: {profile.kbli_code} - {kbli_title}\n"
                f"Skala Usaha: {profile.business_scale}\n"
                f"Deskripsi Usaha: {profile.description}\n\n"
                f"PERINGATAN / DISCLAIMER:\n{LEGAL_DISCLAIMER_ID}\n"
            )
            zf.writestr(f"{doc_type}.txt", content.encode("utf-8"))
    return buf.getvalue()
