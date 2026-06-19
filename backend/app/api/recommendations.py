"""
POST  /api/v1/recommendations   – run the engine for the current user and persist results
GET   /api/v1/recommendations/me – fetch the latest saved recommendation set
"""
from __future__ import annotations

from sqlalchemy import delete, select

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DbSession
from app.ml.recommender import get_knowledge_base
from app.models.auth import Profile
from app.models.careers import Recommendation
from app.schemas.careers import RecommendationItem, RecommendationResponse


router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _run_engine(user, db: DbSession) -> list[dict]:
    """Pull the user's profile and return raw engine results."""
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complete your profile before requesting recommendations.",
        )

    kb = get_knowledge_base()
    results = kb.recommend(
        skills=list(profile.skills or []),
        interests=list(profile.interests or []),
        cgpa=float(profile.cgpa) if profile.cgpa else None,
        certifications=list(profile.certifications or []),
        top_n=5,
    )
    return results


@router.post("", response_model=RecommendationResponse, status_code=status.HTTP_201_CREATED)
def create_recommendations(user: CurrentUser, db: DbSession) -> RecommendationResponse:
    """Run the recommendation engine and persist results, replacing any previous run."""
    results = _run_engine(user, db)

    # Delete previous run for this user
    db.execute(delete(Recommendation).where(Recommendation.user_id == user.id))

    # Persist new results
    for rank, item in enumerate(results, start=1):
        db.add(
            Recommendation(
                user_id=user.id,
                career_name=item["career_name"],
                match_pct=item["match_pct"],
                matched_skills=item["matched_skills"],
                skill_gaps=item["skill_gaps"],
                rank=rank,
            )
        )
    db.commit()

    return RecommendationResponse(
        user_id=user.id,
        results=[
            RecommendationItem(
                career_name=r["career_name"],
                description=r["description"],
                match_pct=r["match_pct"],
                matched_skills=r["matched_skills"],
                skill_gaps=r["skill_gaps"],
                rank=idx + 1,
            )
            for idx, r in enumerate(results)
        ],
    )


@router.get("/me", response_model=RecommendationResponse)
def get_my_recommendations(user: CurrentUser, db: DbSession) -> RecommendationResponse:
    """Return the most recently persisted recommendation set for the current user."""
    rows = db.scalars(
        select(Recommendation)
        .where(Recommendation.user_id == user.id)
        .order_by(Recommendation.rank)
    ).all()

    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if profile and rows:
        recs_created_at = rows[0].created_at
        if profile.updated_at > recs_created_at:
            # Stale! Re-run recommendation engine automatically
            return create_recommendations(user, db)

    if not rows:
        # Run on-demand if never called before
        return create_recommendations(user, db)

    kb = get_knowledge_base()
    all_careers = {c["career_name"]: c["description"] for c in kb.all_careers()}

    return RecommendationResponse(
        user_id=user.id,
        results=[
            RecommendationItem(
                career_name=r.career_name,
                description=all_careers.get(r.career_name, ""),
                match_pct=float(r.match_pct),
                matched_skills=list(r.matched_skills or []),
                skill_gaps=list(r.skill_gaps or []),
                rank=r.rank,
            )
            for r in rows
        ],
    )
