from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Auth Contracts (/auth/*)
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Shared Enums & Literals (/api/v1/*)
# ---------------------------------------------------------------------------

BusinessScale = Literal["mikro", "kecil"]
RiskTier = Literal["rendah", "menengah rendah", "menengah tinggi", "tinggi"]
ObligationTrack = Literal["OSS", "PIRT", "HALAL", "SPT"]
TrackStatusLiteral = Literal["ready", "coming_soon"]
DocumentTypeLiteral = Literal[
    "surat_pernyataan_mandiri_oss",
    "komitmen_sanitasi_pirt",
    "surat_ikrar_halal",
]
DocumentStatusLiteral = Literal["pending", "ready", "failed"]

LEGAL_DISCLAIMER_ID = (
    "Informasi ini adalah panduan awal berbasis regulasi resmi dan bukan merupakan "
    "nasihat atau pendapat hukum. Selalu verifikasi dokumen akhir di portal resmi pemerintah."
)


# ---------------------------------------------------------------------------
# 1. Smart Onboarding & KBLI 2025 Profiler (/api/v1/profiler/match) — #63, #67
# ---------------------------------------------------------------------------


class ProfilerMatchRequest(BaseModel):
    description: str = Field(
        min_length=10,
        max_length=1000,
        description="Free-text business description in Bahasa Indonesia (FR 1).",
        examples=[
            "Saya memproduksi keripik pisang aneka rasa dari dapur rumah dan menjualnya ke warung sekitar."
        ],
    )


class KbliCandidate(BaseModel):
    kode: str = Field(
        pattern=r"^\d{5}$",
        description="5-digit KBLI 2025 code.",
        examples=["10794"],
    )
    judul: str = Field(
        description="Official KBLI 2025 title.",
        examples=["Industri Kerupuk, Keripik, Peyek dan Sejenisnya"],
    )
    deskripsi: str = Field(
        description="Official KBLI 2025 scope description.",
    )
    score: float = Field(
        ge=0.0,
        le=1.0,
        description="Cosine similarity / re-ranked confidence score (0.0 to 1.0).",
        examples=[0.94],
    )
    risk_tier: RiskTier = Field(
        default="rendah",
        description="Default OSS-RBA risk tier for micro/small scale.",
        examples=["rendah"],
    )


class ProfilerMatchResponse(BaseModel):
    candidates: list[KbliCandidate] = Field(
        description="Top-3 KBLI 2025 candidates ordered by score descending (FR 2)."
    )
    kbli_version: str = Field(default="2025")


# ---------------------------------------------------------------------------
# 2. Business Profile API (/api/v1/business-profile) — #77, #67, #70
# ---------------------------------------------------------------------------


class BusinessProfileUpsertRequest(BaseModel):
    business_name: str = Field(
        default="Usaha UMKM Saya",
        min_length=1,
        max_length=255,
        description="Display name of the user's micro/small business.",
        examples=["Keripik Pisang Bu Siti"],
    )
    description: str = Field(
        min_length=10,
        max_length=2000,
        description="Plain-language Bahasa Indonesia business description.",
        examples=[
            "Saya memproduksi keripik pisang aneka rasa dari dapur rumah dan menjualnya ke warung sekitar."
        ],
    )
    kbli_code: str = Field(
        pattern=r"^\d{5}$",
        description="Confirmed or manually overridden 5-digit KBLI 2025 code (FR 3).",
        examples=["10794"],
    )
    business_scale: BusinessScale = Field(
        default="mikro",
        description="MSME scale under PP No. 7/2021 ('mikro' or 'kecil').",
    )
    risk_tier: RiskTier | None = Field(
        default=None,
        description="OSS-RBA risk tier; auto-derived from KBLI 2025 corpus if omitted.",
    )
    is_manual_override: bool = Field(
        default=False,
        description="True when the user manually searched/overrode the AI-suggested KBLI code (FR 3).",
    )


class BusinessProfileResponse(BaseModel):
    id: int
    user_id: int
    business_name: str
    description: str
    kbli_code: str
    kbli_title: str
    business_scale: BusinessScale = "mikro"
    risk_tier: RiskTier = "rendah"
    is_manual_override: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# 3. Interactive Compliance Wizard (/api/v1/compliance/checklist) — #68, #70
# ---------------------------------------------------------------------------


class ChecklistRequest(BaseModel):
    kbli: str | None = Field(
        default=None,
        pattern=r"^\d{5}$",
        description="5-digit KBLI 2025 code. If omitted, loaded from the user's saved Business Profile (#77).",
        examples=["10794"],
    )
    business_scale: BusinessScale | None = Field(
        default=None,
        description="Business scale ('mikro' or 'kecil'). Defaults to saved profile or 'mikro'.",
    )
    description: str | None = Field(
        default=None,
        description="Optional business description for vector retrieval context.",
    )


class ChecklistItem(BaseModel):
    obligation_id: str = Field(examples=["OSS-001"])
    track: ObligationTrack = Field(examples=["OSS"])
    title: str = Field(examples=["Nomor Induk Berusaha (NIB) Berbasis Risiko"])
    requirement_text: str = Field(
        description="Plain-language Bahasa Indonesia obligation summary (FR 6)."
    )
    issuing_agency: str = Field(examples=["Kementerian Investasi dan Hilirisasi/BKPM"])
    citation: str = Field(
        description="Mandatory regulatory article citation (FR 7).",
        examples=["PP No. 5 Tahun 2021 Pasal 12 ayat (1) dan ayat (2) jo. PP No. 28 Tahun 2025"],
    )
    source_article: str = Field(
        description="Alias of citation matching obligations.source_article column.",
        examples=["PP No. 5 Tahun 2021 Pasal 12 ayat (1) dan ayat (2) jo. PP No. 28 Tahun 2025"],
    )
    source_url: str = Field(
        description="Direct official regulation link (FR 7).",
        examples=["https://peraturan.bpk.go.id/Details/161835/pp-no-5-tahun-2021"],
    )
    needs_manual_verification: bool = Field(
        default=False,
        description="True when obligation has conditional/regional caveats and must be verified manually (FR 8).",
    )
    notes: str | None = None


class TrackChecklistGroup(BaseModel):
    track: ObligationTrack
    track_status: TrackStatusLiteral = Field(
        description=(
            "'ready' when track corpus is ingested in DB; 'coming_soon' if track corpus "
            "is not yet ingested by the Day 8 cutoff so the UI/LLM never hallucinates."
        )
    )
    items: list[ChecklistItem] = Field(default_factory=list)


class ChecklistResponse(BaseModel):
    kbli_code: str
    kbli_title: str
    business_scale: BusinessScale
    risk_tier: RiskTier
    obligations: list[ChecklistItem] = Field(
        description="Flat list of matched obligations (compatible with frontend/lib/compliance.ts)."
    )
    tracks: dict[ObligationTrack, TrackChecklistGroup] = Field(
        description="Obligations grouped by track (OSS, PIRT, HALAL, SPT) with track_status flags."
    )
    disclaimer: str = Field(default=LEGAL_DISCLAIMER_ID)


# ---------------------------------------------------------------------------
# 4. Grounded RAG Compliance Q&A (/api/v1/chat/ask) — #63 Phase 5
# ---------------------------------------------------------------------------


class ChatAskRequest(BaseModel):
    question: str = Field(
        min_length=5,
        max_length=1000,
        description="User compliance question in Bahasa Indonesia.",
        examples=["Apa saja syarat izin usaha untuk produksi keripik pisang rumahan skala mikro?"],
    )
    kbli_code: str | None = Field(
        default=None,
        pattern=r"^\d{5}$",
        description="Optional 5-digit KBLI 2025 context.",
        examples=["10794"],
    )


class ChatCitation(BaseModel):
    obligation_id: str = Field(examples=["OSS-001"])
    source_article: str = Field(
        examples=["PP No. 5 Tahun 2021 Pasal 12 ayat (1) dan ayat (2) jo. PP No. 28 Tahun 2025"]
    )
    source_url: str = Field(
        examples=["https://peraturan.bpk.go.id/Details/161835/pp-no-5-tahun-2021"]
    )


class ChatAskResponse(BaseModel):
    answer: str = Field(
        description="Grounded Bahasa Indonesia answer synthesized strictly from retrieved regulation chunks."
    )
    citations: list[ChatCitation] = Field(
        description="Source citations backing every regulatory claim."
    )
    disclaimer: str = Field(default=LEGAL_DISCLAIMER_ID)


# ---------------------------------------------------------------------------
# 5. Auto-Document PDF Generator (/api/v1/documents/*) — #69, #71
# ---------------------------------------------------------------------------


class DocumentGenerateRequest(BaseModel):
    document_types: list[DocumentTypeLiteral] | None = Field(
        default=None,
        description="Specific document types to generate; defaults to all 3 core MSME draft documents.",
    )
    kbli_code: str | None = Field(
        default=None,
        pattern=r"^\d{5}$",
        description="Optional override; otherwise reads from the user's saved Business Profile (#77).",
    )


class GeneratedDocumentItem(BaseModel):
    id: int
    business_profile_id: int
    document_type: str
    title: str
    issuer: str
    status: DocumentStatusLiteral
    file_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[GeneratedDocumentItem]
    disclaimer: str = Field(default=LEGAL_DISCLAIMER_ID)
