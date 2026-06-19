from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DbSession
from app.models.auth import Profile
from app.schemas.profile import ProfileResponse, ProfileUpdate


router = APIRouter(prefix="/profiles", tags=["profiles"])


def clean_list(values: list[str] | None) -> list[str] | None:
    if values is None:
        return None
    return list(dict.fromkeys(value.strip() for value in values if value.strip()))


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(user: CurrentUser, db: DbSession) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.patch("/me", response_model=ProfileResponse)
def update_my_profile(payload: ProfileUpdate, user: CurrentUser, db: DbSession) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    updates = payload.model_dump(exclude_unset=True)
    for field in ("skills", "interests", "certifications"):
        if field in updates:
            updates[field] = clean_list(updates[field])
    for field, value in updates.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_profile(user: CurrentUser, db: DbSession) -> None:
    db.delete(user)
    db.commit()
