"""GET /api/v1/skill-gaps?career=<name> — skill gap analysis for a specific career."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUser, DbSession
from app.ml.recommender import get_knowledge_base
from app.models.auth import Profile
from sqlalchemy import select
from app.schemas.careers import SkillGapResponse


router = APIRouter(prefix="/skill-gaps", tags=["skill-gaps"])


@router.get("", response_model=SkillGapResponse)
def get_skill_gap(
    user: CurrentUser,
    db: DbSession,
    career: str = Query(..., description="Career name to analyse (e.g. 'Data Scientist / ML Engineer')"),
) -> SkillGapResponse:
    """Return which skills the user has vs. what the target career requires."""
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    skills = list(profile.skills or []) if profile else []
    interests = list(profile.interests or []) if profile else []

    kb = get_knowledge_base()
    gap = kb.get_skill_gaps(career_name=career, skills=skills, interests=interests)

    if "error" in gap:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=gap["error"])

    you_have = gap.get("you_have", [])
    total = gap.get("total_required_skills", 1) or 1
    coverage = round(len(you_have) / total * 100, 1)

    return SkillGapResponse(
        career_name=gap["career_name"],
        description=gap["description"],
        you_have=you_have,
        you_need=gap.get("you_need", []),
        total_required_skills=total,
        coverage_pct=min(coverage, 100.0),
        skill_importance=gap.get("skill_importance", {}),
        learning_sequence=gap.get("learning_sequence", [])
    )
