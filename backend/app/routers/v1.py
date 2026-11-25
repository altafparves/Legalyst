"""FastAPI v1 OpenAPI contract routers for Profiler, Compliance Checklist, RAG Chat & Documents (#83, #77)."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth import InvalidTokenError, decode_access_token
from app.deps import get_current_user, get_db
from app.models import BusinessProfile, User
from app.schemas import (
    BusinessScale,
    ChatAskRequest,
    ChatAskResponse,
    ChecklistRequest,
    ChecklistResponse,
    DocumentGenerateRequest,
    DocumentListResponse,
    DocumentTypeLiteral,
    ProfilerMatchRequest,
    ProfilerMatchResponse,
)
from app.services.business_profile import get_user_business_profile
from app.services.compliance import answer_compliance_question, generate_checklist
from app.services.documents import (
    build_documents_zip_bytes,
    generate_user_documents,
    list_user_documents,
    render_document_pdf_bytes,
)
from app.services.kbli import get_kbli_entry
from app.services.profiler import match_kbli

optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

router = APIRouter(prefix="/api/v1")


def get_optional_user(
    token: str | None = Depends(optional_oauth2),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None
    try:
        email = decode_access_token(token)
    except InvalidTokenError:
        return None
    return db.query(User).filter(User.email == email).first()


# ---------------------------------------------------------------------------
# 1. Smart Onboarding & KBLI 2025 Profiler (/api/v1/profiler/match)
# ---------------------------------------------------------------------------


@router.post(
    "/profiler/match",
    response_model=ProfilerMatchResponse,
    tags=["profiler"],
)
def profiler_match(payload: ProfilerMatchRequest) -> ProfilerMatchResponse:
    """Return Top-3 KBLI 2025 candidates with confidence scores and risk tiers (FR 2)."""
    candidates = match_kbli(payload.description)
    return ProfilerMatchResponse(candidates=candidates, kbli_version="2025")


# ---------------------------------------------------------------------------
# 2. Interactive Compliance Wizard (/api/v1/compliance/checklist)
# ---------------------------------------------------------------------------


@router.post(
    "/compliance/checklist",
    response_model=ChecklistResponse,
    tags=["compliance"],
)
def compliance_checklist(
    payload: ChecklistRequest | None = None,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> ChecklistResponse:
    """Return matched obligations grouped by track with 100% citations and Day 8 cutoff flags."""
    kbli_code = payload.kbli if payload and payload.kbli else None
    business_scale: BusinessScale | None = (
        payload.business_scale if payload and payload.business_scale else None
    )
    description = payload.description if payload and payload.description else None

    if kbli_code is None:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide 'kbli' in request body or authenticate with a saved Business Profile.",
            )
        saved_profile = get_user_business_profile(db=db, user=current_user)
        kbli_code = saved_profile.kbli_code
        business_scale = business_scale or saved_profile.business_scale
        description = description or saved_profile.description

    if get_kbli_entry(kbli_code) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid KBLI 2025 code '{kbli_code}'.",
        )

    return generate_checklist(
        db=db,
        kbli_code=kbli_code,
        business_scale=business_scale or "mikro",
        description=description,
    )


# ---------------------------------------------------------------------------
# 3. Grounded RAG Compliance Q&A (/api/v1/chat/ask)
# ---------------------------------------------------------------------------


@router.post(
    "/chat/ask",
    response_model=ChatAskResponse,
    tags=["chat"],
)
def chat_ask(
    payload: ChatAskRequest,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> ChatAskResponse:
    """Answer an Indonesian MSME compliance question grounded strictly on retrieved regulations."""
    kbli_code = payload.kbli_code
    if kbli_code is None and current_user is not None:
        try:
            saved = get_user_business_profile(db=db, user=current_user)
            kbli_code = saved.kbli_code
        except HTTPException:
            kbli_code = None

    return answer_compliance_question(
        db=db,
        question=payload.question,
        kbli_code=kbli_code,
    )


# ---------------------------------------------------------------------------
# 4. Auto-Document PDF Generator (/api/v1/documents/*)
# ---------------------------------------------------------------------------


def _resolve_profile_model(db: Session, user: User) -> BusinessProfile:
    profile = (
        db.query(BusinessProfile)
        .filter(BusinessProfile.user_id == user.id)
        .order_by(BusinessProfile.id.desc())
        .first()
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found for current user. Save a Business Profile first.",
        )
    return profile


@router.post(
    "/documents/generate",
    response_model=DocumentListResponse,
    tags=["documents"],
)
def documents_generate(
    background_tasks: BackgroundTasks,
    payload: DocumentGenerateRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentListResponse:
    """Trigger draft document generation using the user's saved Business Profile (#69, #77, #83)."""
    profile = _resolve_profile_model(db=db, user=current_user)
    doc_types = payload.document_types if payload else None
    kbli_override = payload.kbli_code if payload else None
    return generate_user_documents(
        db=db,
        profile=profile,
        document_types=doc_types,
        kbli_code_override=kbli_override,
        background_tasks=background_tasks,
    )


@router.get(
    "/documents",
    response_model=DocumentListResponse,
    tags=["documents"],
)
def documents_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentListResponse:
    """List generated compliance documents for the authenticated user's Business Profile."""
    profile = _resolve_profile_model(db=db, user=current_user)
    return list_user_documents(db=db, profile=profile)


@router.get(
    "/documents/download/{doc_type}",
    tags=["documents"],
)
def documents_download_single(
    doc_type: DocumentTypeLiteral,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Download an individual rendered compliance draft PDF for the user's Business Profile (#69)."""
    profile = _resolve_profile_model(db=db, user=current_user)
    entry = get_kbli_entry(profile.kbli_code or "")
    kbli_title = entry.judul if entry else f"KBLI {profile.kbli_code}"
    pdf_bytes = render_document_pdf_bytes(
        doc_type=doc_type,
        profile=profile,
        kbli_title=kbli_title,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{doc_type}-{profile.kbli_code}.pdf"'
            )
        },
    )


@router.get(
    "/documents/download-zip",
    tags=["documents"],
)
def documents_download_zip(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Bundle all 3 draft compliance PDFs for the user's Business Profile into a .zip archive."""
    profile = _resolve_profile_model(db=db, user=current_user)
    entry = get_kbli_entry(profile.kbli_code or "")
    kbli_title = entry.judul if entry else f"KBLI {profile.kbli_code}"
    zip_bytes = build_documents_zip_bytes(profile=profile, kbli_title=kbli_title)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="legalyst-dokumen-{profile.kbli_code}.zip"'
        },
    )
