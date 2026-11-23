"""Business Profile persistence & KBLI 2025 validation service (#77)."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import BusinessProfile, User
from app.schemas import (
    BusinessProfileResponse,
    BusinessProfileUpsertRequest,
    BusinessScale,
    RiskTier,
)
from app.services.kbli import get_kbli_entry

VALID_TIERS: set[str] = {"rendah", "menengah rendah", "menengah tinggi", "tinggi"}
VALID_SCALES: set[str] = {"mikro", "kecil"}


def to_business_profile_response(profile: BusinessProfile) -> BusinessProfileResponse:
    kbli_code = profile.kbli_code or ""
    entry = get_kbli_entry(kbli_code)
    kbli_title = entry.judul if entry else f"KBLI {kbli_code}"
    raw_tier = (profile.risk_tier or "").strip().lower()
    risk_tier: RiskTier = (
        raw_tier  # type: ignore[assignment]
        if raw_tier in VALID_TIERS
        else (entry.default_risk_tier if entry else "rendah")
    )
    raw_scale = (profile.business_scale or "mikro").strip().lower()
    business_scale: BusinessScale = (
        raw_scale if raw_scale in VALID_SCALES else "mikro"  # type: ignore[assignment]
    )
    return BusinessProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        business_name=profile.business_name,
        description=profile.description,
        kbli_code=kbli_code,
        kbli_title=kbli_title,
        business_scale=business_scale,
        risk_tier=risk_tier,
        is_manual_override=bool(profile.is_manual_override),
        created_at=profile.created_at,
    )


def upsert_user_business_profile(
    db: Session,
    user: User,
    payload: BusinessProfileUpsertRequest,
) -> BusinessProfileResponse:
    """Validate KBLI 2025 code and upsert the authenticated user's BusinessProfile (#77)."""
    entry = get_kbli_entry(payload.kbli_code)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid KBLI 2025 code '{payload.kbli_code}'. "
                "Code must be a valid 5-digit code from data/kbli_2025.csv."
            ),
        )

    resolved_risk: RiskTier = payload.risk_tier or entry.default_risk_tier

    profile = (
        db.query(BusinessProfile)
        .filter(BusinessProfile.user_id == user.id)
        .order_by(BusinessProfile.id.desc())
        .first()
    )

    if profile is None:
        profile = BusinessProfile(
            user_id=user.id,
            business_name=payload.business_name.strip(),
            description=payload.description.strip(),
            kbli_code=entry.kode,
            business_scale=payload.business_scale,
            risk_tier=resolved_risk,
            is_manual_override=payload.is_manual_override,
        )
        db.add(profile)
    else:
        profile.business_name = payload.business_name.strip()
        profile.description = payload.description.strip()
        profile.kbli_code = entry.kode
        profile.business_scale = payload.business_scale
        profile.risk_tier = resolved_risk
        profile.is_manual_override = payload.is_manual_override

    db.commit()
    db.refresh(profile)
    return to_business_profile_response(profile)


def get_user_business_profile(db: Session, user: User) -> BusinessProfileResponse:
    """Return the latest saved BusinessProfile for the authenticated user (#77)."""
    profile = (
        db.query(BusinessProfile)
        .filter(BusinessProfile.user_id == user.id)
        .order_by(BusinessProfile.id.desc())
        .first()
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found for current user. Complete onboarding first.",
        )
    return to_business_profile_response(profile)
