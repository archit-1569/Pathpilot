"""
GET /api/v1/roadmaps?career=<name>
Returns the personalized learning roadmap for a target career, with each skill
marked as acquired (user already has it) or pending (user needs to learn it).
"""
from __future__ import annotations

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DbSession
from app.ml.recommender import get_knowledge_base, _normalize_token
from app.models.auth import Profile
from app.schemas.roadmaps import RoadmapResponse, RoadmapSkill, RoadmapStage


router = APIRouter(prefix="/roadmaps", tags=["roadmaps"])


@router.get("", response_model=RoadmapResponse)
def get_roadmap(
    career: str = Query(..., description="Target career name"),
    user: CurrentUser = None,
    db: DbSession = None,
) -> RoadmapResponse:
    """Return a personalized learning roadmap for the given career."""
    kb = get_knowledge_base()
    all_careers = kb.all_careers()

    career_data = next(
        (c for c in all_careers if c["career_name"].lower() == career.lower()),
        None,
    )
    if not career_data:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Career '{career}' not found")

    # Fetch user skills if authenticated
    user_skills: set[str] = set()
    if user and db:
        profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
        if profile:
            user_skills = {_normalize_token(s) for s in (list(profile.skills or []) + list(profile.interests or [])) if s.strip()}

    roadmap_stages_raw: list[dict] = career_data.get("learning_roadmap", [])

    stages: list[RoadmapStage] = []
    total_skills = 0
    acquired_count = 0

    for stage_data in roadmap_stages_raw:
        skills_in_stage = stage_data.get("skills", [])
        roadmap_skills: list[RoadmapSkill] = []

        for skill_name in skills_in_stage:
            acquired = _normalize_token(skill_name) in user_skills
            roadmap_skills.append(RoadmapSkill(name=skill_name, acquired=acquired))
            total_skills += 1
            if acquired:
                acquired_count += 1

        stage_completed = all(s.acquired for s in roadmap_skills) and len(roadmap_skills) > 0

        stages.append(RoadmapStage(
            stage=stage_data.get("stage", ""),
            title=stage_data.get("title", ""),
            skills=roadmap_skills,
            completed=stage_completed,
        ))

    completion_pct = round((acquired_count / total_skills * 100), 1) if total_skills > 0 else 0.0

    return RoadmapResponse(
        career_name=career_data["career_name"],
        description=career_data["description"],
        total_skills=total_skills,
        acquired_skills=acquired_count,
        completion_pct=completion_pct,
        stages=stages,
    )
