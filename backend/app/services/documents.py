"""Auto-Document PDF generator, Supabase Storage uploader & ZIP service (#83, #69, #77)."""

from __future__ import annotations

from datetime import datetime, timezone
import io
import os
import zipfile

from fastapi import BackgroundTasks, HTTPException, status
import httpx
from sqlalchemy.orm import Session

from app.models import BusinessProfile, GeneratedDocument
from app.schemas import (
    LEGAL_DISCLAIMER_ID,
    DocumentListResponse,
    DocumentTypeLiteral,
    GeneratedDocumentItem,
)
from app.services.kbli import get_kbli_entry

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

DOCUMENT_CLAUSES: dict[DocumentTypeLiteral, tuple[str, list[str]]] = {
    "surat_pernyataan_mandiri_oss": (
        "Dasar Hukum: PP No. 5 Tahun 2021 & Peraturan BKPM No. 4 Tahun 2021 Lampiran III & IV",
        [
            "1. Bersedia menjaga Keselamatan, Keamanan, Kesehatan, dan Pelestarian Fungsi Lingkungan (K3L) dalam menjalankan kegiatan usaha.",
            "2. Menyatakan kesanggupan pengelolaan dan pemantauan lingkungan hidup (SPPL) sesuai ketentuan perizinan berusaha berbasis risiko.",
            "3. Memastikan lokasi kegiatan usaha telah sesuai dengan Rencana Tata Ruang (RTR) atau ketentuan pemanfaatan ruang bagi Usaha Mikro dan Kecil.",
            "4. Apabila di kemudian hari pernyataan ini tidak dipenuhi, pelaku usaha bersedia menerima pembinaan dan sanksi administratif sesuai ketentuan peraturan perundang-undangan.",
        ],
    ),
    "komitmen_sanitasi_pirt": (
        "Dasar Hukum: Peraturan BPOM No. 22 Tahun 2021 tentang Pedoman Penerbitan SPP-IRT",
        [
            "1. Berkomitmen menerapkan Cara Produksi Pangan Olahan yang Baik untuk Industri Rumah Tangga (CPPB-IRT) secara konsisten di tempat produksi.",
            "2. Menjaga kebersihan area dapur produksi, peralatan pengolahan, bahan baku, serta higienitas penjamah pangan selama proses produksi dan pengemasan.",
            "3. Mengikuti Penyuluhan Keamanan Pangan (PKP) dan mencantumkan label pangan olahan yang benar (nama produk, komposisi, berat bersih, kode produksi, dan tanggal kedaluwarsa).",
            "4. Bersedia dilakukan pemeriksaan sarana produksi oleh Dinas Kesehatan Kabupaten/Kota atau pengawas pangan yang berwenang.",
        ],
    ),
    "surat_ikrar_halal": (
        "Dasar Hukum: UU No. 33 Tahun 2014 & PP No. 42 Tahun 2024 tentang Penyelenggaraan Bidang Jaminan Produk Halal",
        [
            "1. Menyatakan bahwa seluruh bahan baku, bahan tambahan, dan bahan penolong yang digunakan dalam proses produksi telah dipastikan kehalalannya dan bebas dari bahan kritis/haram/najis.",
            "2. Proses produksi dilakukan secara sederhana, bersih, dan terpisah dari bahan atau fasilitas yang mengandung unsur tidak halal.",
            "3. Bersedia didampingi oleh Pendamping Proses Produk Halal (P3H) dalam verifikasi dan validasi pernyataan mandiri (Self-Declare / SEHATI).",
            "4. Berkomitmen menjaga konsistensi kehalalan produk dan mencantumkan Label Halal Indonesia resmi setelah Sertifikat Halal diterbitkan oleh BPJPH.",
        ],
    ),
}


def _sanitize_latin1(text: str) -> str:
    """Normalize common Unicode punctuation to Latin-1 safe characters for PDF core fonts."""
    replacements = {
        "\u2013": "-",
        "\u2014": "--",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "*",
        "\u2026": "...",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _minimal_pdf_fallback(lines: list[str]) -> bytes:
    """Pure-Python valid PDF-1.4 fallback if fpdf2 is unavailable."""
    safe_lines = [
        _sanitize_latin1(line).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        for line in lines
    ]
    text_ops = ["BT", "/F1 10 Tf", "50 780 Td", "14 TL"]
    for line in safe_lines:
        text_ops.append(f"({line}) Tj T*")
    text_ops.append("ET")
    stream_bytes = "\n".join(text_ops).encode("latin-1")

    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        f"5 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n".encode("latin-1")
        + stream_bytes
        + b"\nendstream\nendobj\n",
    ]

    buf = io.BytesIO()
    buf.write(b"%PDF-1.4\n")
    offsets: list[int] = []
    for obj in objects:
        offsets.append(buf.tell())
        buf.write(obj)
    xref_pos = buf.tell()
    buf.write(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("latin-1"))
    for off in offsets:
        buf.write(f"{off:010d} 00000 n \n".encode("latin-1"))
    buf.write(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "latin-1"
        )
    )
    return buf.getvalue()


def render_document_pdf_bytes(
    doc_type: DocumentTypeLiteral,
    profile: BusinessProfile,
    kbli_title: str | None = None,
) -> bytes:
    """Render a dynamically populated A4 compliance draft PDF for the given BusinessProfile (#69)."""
    if doc_type not in DOCUMENT_CATALOG:
        raise ValueError(f"Unsupported document_type: {doc_type}")

    title, issuer = DOCUMENT_CATALOG[doc_type]
    legal_basis, clauses = DOCUMENT_CLAUSES[doc_type]
    kbli_code = (profile.kbli_code or "").strip()
    if not kbli_title:
        entry = get_kbli_entry(kbli_code)
        kbli_title = entry.judul if entry else f"KBLI {kbli_code}"

    scale_label = "Usaha Mikro" if (profile.business_scale or "mikro") == "mikro" else "Usaha Kecil"
    risk_label = (profile.risk_tier or "rendah").title()
    printed_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    try:
        from fpdf import FPDF
        from fpdf.enums import XPos, YPos

        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.set_margins(left=18, top=18, right=18)
        pdf.set_auto_page_break(auto=True, margin=18)
        pdf.add_page()

        # Header
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(
            0,
            6,
            _sanitize_latin1(f"DRAFT DOKUMEN KEPATUHAN UMKM - {issuer.upper()}"),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
            align="C",
        )
        pdf.set_font("Helvetica", "B", 14)
        pdf.multi_cell(
            0,
            7,
            _sanitize_latin1(title.upper()),
            align="C",
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.set_font("Helvetica", "I", 9)
        pdf.multi_cell(
            0,
            5,
            _sanitize_latin1(legal_basis),
            align="C",
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.ln(4)

        # Divider line
        y = pdf.get_y()
        pdf.line(18, y, 192, y)
        pdf.ln(5)

        # Identity section
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(
            0,
            7,
            "I. IDENTITAS PELAKU USAHA & PROFIL KBLI 2025",
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.set_font("Helvetica", "", 10)

        profile_rows = [
            ("Nama Usaha", profile.business_name or "Usaha UMKM"),
            ("Kode & Judul KBLI 2025", f"{kbli_code} - {kbli_title}"),
            ("Skala Usaha", f"{scale_label} ({profile.business_scale})"),
            ("Tingkat Risiko OSS-RBA", risk_label),
            ("Tanggal Pembuatan Draft", printed_date),
        ]
        for label, val in profile_rows:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(
                52,
                6,
                _sanitize_latin1(f"{label}"),
                new_x=XPos.RIGHT,
                new_y=YPos.TOP,
            )
            pdf.set_font("Helvetica", "", 10)
            pdf.multi_cell(
                0,
                6,
                _sanitize_latin1(f": {val}"),
                new_x=XPos.LMARGIN,
                new_y=YPos.NEXT,
            )

        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(
            0,
            6,
            "Deskripsi Kegiatan Usaha:",
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(
            0,
            5.5,
            _sanitize_latin1(profile.description or "-"),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.ln(4)

        # Statement clauses
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(
            0,
            7,
            "II. PERNYATAAN DAN KOMITMEN KEPATUHAN",
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(
            0,
            5.5,
            _sanitize_latin1(
                "Dengan ini saya selaku penanggung jawab / pemilik usaha menyatakan dengan sebenar-benarnya bahwa:"
            ),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.ln(2)
        for clause in clauses:
            pdf.multi_cell(
                0,
                5.5,
                _sanitize_latin1(clause),
                new_x=XPos.LMARGIN,
                new_y=YPos.NEXT,
            )
            pdf.ln(1.5)

        pdf.ln(4)
        pdf.multi_cell(
            0,
            5.5,
            _sanitize_latin1(
                "Demikian surat pernyataan dan komitmen ini dibuat dengan penuh kesadaran dan tanggung jawab "
                "untuk dipergunakan sebagai kelengkapan perizinan berusaha pada portal resmi pemerintah."
            ),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.ln(8)

        # Signature & Materai block
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(105, 6, "", new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.cell(
            0,
            6,
            _sanitize_latin1(f"Tanggal: {printed_date}"),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.cell(105, 6, "", new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(
            0,
            6,
            "Penanggung Jawab / Pemilik Usaha,",
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.ln(4)
        pdf.cell(105, 14, "", new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(
            55,
            14,
            "[ Materai Rp10.000 & Tanda Tangan ]",
            border=1,
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
            align="C",
        )
        pdf.ln(4)
        pdf.cell(105, 6, "", new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(
            0,
            6,
            _sanitize_latin1(f"({profile.business_name or 'Pemilik Usaha'})"),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )

        # Disclaimer Banner at bottom
        pdf.ln(8)
        y_disc = pdf.get_y()
        pdf.line(18, y_disc, 192, y_disc)
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(
            0,
            4.5,
            "PERINGATAN / DISCLAIMER HUKUM (LEGALYST):",
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.set_font("Helvetica", "I", 8)
        pdf.multi_cell(
            0,
            4.5,
            _sanitize_latin1(LEGAL_DISCLAIMER_ID),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )

        raw_out = pdf.output()
        return bytes(raw_out) if isinstance(raw_out, (bytes, bytearray)) else raw_out.encode("latin-1")
    except Exception:
        fallback_lines = [
            f"{title} ({issuer})",
            legal_basis,
            f"Nama Usaha: {profile.business_name}",
            f"Kode KBLI 2025: {kbli_code} - {kbli_title}",
            f"Skala Usaha: {profile.business_scale} | Risiko: {profile.risk_tier}",
            f"Deskripsi: {profile.description}",
            *clauses,
            f"Disclaimer: {LEGAL_DISCLAIMER_ID}",
        ]
        return _minimal_pdf_fallback(fallback_lines)


def upload_pdf_to_supabase(storage_path: str, pdf_bytes: bytes) -> str | None:
    """Upload rendered PDF bytes to Supabase Storage (`generated-documents` bucket).

    Returns the Supabase Storage object URL when configured and successful, or None
    when Supabase credentials are not configured (e.g., local dev / CI) or on error.
    """
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    bucket = (
        os.environ.get("SUPABASE_STORAGE_BUCKET", "generated-documents").strip()
        or "generated-documents"
    )
    if not supabase_url or not service_key:
        return None

    clean_path = storage_path.lstrip("/")
    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{clean_path}"
    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
    }
    try:
        resp = httpx.post(upload_url, content=pdf_bytes, headers=headers, timeout=10.0)
        if resp.status_code in (200, 201):
            return f"{supabase_url}/storage/v1/object/public/{bucket}/{clean_path}"
    except Exception:
        return None
    return None


def _background_upload_to_supabase(
    storage_path: str,
    pdf_bytes: bytes,
) -> None:
    """BackgroundTask wrapper that uploads the rendered PDF to Supabase Storage."""
    upload_pdf_to_supabase(storage_path=storage_path, pdf_bytes=pdf_bytes)


def generate_user_documents(
    db: Session,
    profile: BusinessProfile,
    document_types: list[DocumentTypeLiteral] | None = None,
    kbli_code_override: str | None = None,
    background_tasks: BackgroundTasks | None = None,
) -> DocumentListResponse:
    """Render PDFs, upload to Supabase Storage, and upsert GeneratedDocument rows (#83, #69)."""
    if kbli_code_override:
        override_entry = get_kbli_entry(kbli_code_override)
        if override_entry is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid KBLI 2025 code '{kbli_code_override}'.",
            )
        profile.kbli_code = override_entry.kode
        db.flush()

    kbli_code = profile.kbli_code or ""
    entry = get_kbli_entry(kbli_code)
    kbli_title = entry.judul if entry else f"KBLI {kbli_code}"

    target_types = document_types or list(DOCUMENT_CATALOG.keys())
    items: list[GeneratedDocumentItem] = []

    supabase_configured = bool(
        os.environ.get("SUPABASE_URL", "").strip()
        and os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    )

    for doc_type in target_types:
        title, issuer = DOCUMENT_CATALOG[doc_type]
        pdf_bytes = render_document_pdf_bytes(
            doc_type=doc_type,
            profile=profile,
            kbli_title=kbli_title,
        )
        storage_path = f"profile-{profile.id}/{doc_type}.pdf"
        local_download_url = f"/api/v1/documents/download/{doc_type}?profile_id={profile.id}"

        file_url = local_download_url
        if supabase_configured:
            uploaded_url = upload_pdf_to_supabase(storage_path=storage_path, pdf_bytes=pdf_bytes)
            if uploaded_url:
                file_url = uploaded_url
            elif background_tasks is not None:
                background_tasks.add_task(_background_upload_to_supabase, storage_path, pdf_bytes)

        existing = (
            db.query(GeneratedDocument)
            .filter(
                GeneratedDocument.business_profile_id == profile.id,
                GeneratedDocument.document_type == doc_type,
            )
            .first()
        )
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


def build_documents_zip_bytes(profile: BusinessProfile, kbli_title: str | None = None) -> bytes:
    """Bundle the 3 rendered PDF compliance documents into an in-memory .zip archive (#83, #69)."""
    if not kbli_title:
        entry = get_kbli_entry(profile.kbli_code or "")
        kbli_title = entry.judul if entry else f"KBLI {profile.kbli_code}"

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for doc_type in DOCUMENT_CATALOG:
            pdf_bytes = render_document_pdf_bytes(
                doc_type=doc_type,
                profile=profile,
                kbli_title=kbli_title,
            )
            zf.writestr(f"{doc_type}.pdf", pdf_bytes)
    return buf.getvalue()
