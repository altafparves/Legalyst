"""Business Profile API router (`/api/v1/business-profile`) — Ticket #77 & #83."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import User
from app.schemas import BusinessProfileResponse, BusinessProfileUpsertRequest
from app.services.business_profile import (
    get_user_business_profile,
    upsert_user_business_profile,
)

router = APIRouter(prefix="/api/v1/business-profile", tags=["business-profile"])


@router.post("", response_model=BusinessProfileResponse)
def save_business_profile(
    payload: BusinessProfileUpsertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BusinessProfileResponse:
    """Upsert the authenticated user's Business Profile with confirmed/overridden KBLI 2025 code."""
    return upsert_user_business_profile(db=db, user=current_user, payload=payload)


@router.get("", response_model=BusinessProfileResponse)
def load_business_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BusinessProfileResponse:
    """Load the authenticated user's saved Business Profile."""
    return get_user_business_profile(db=db, user=current_user)
