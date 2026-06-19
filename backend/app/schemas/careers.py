"""Pydantic schemas for careers and recommendations (Phase 3)."""
from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class CareerResponse(BaseModel):
    career_name: str
    description: str
    typical_skills: list[str] = Field(default_factory=list)
    survey_count: int = 0
    
    # Phase 4 detailed fields
    overview: str | None = None
    eligibility: str | None = None
    salary_range: str | None = None
    responsibilities: list[str] = Field(default_factory=list)
    career_growth: str | None = None
    industries: list[str] = Field(default_factory=list)
    learning_roadmap: list[dict] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class RecommendationItem(BaseModel):
    career_name: str
    description: str
    match_pct: float = Field(ge=0, le=100)
    matched_skills: list[str] = Field(default_factory=list)
    skill_gaps: list[str] = Field(default_factory=list)
    rank: int = 1


class RecommendationResponse(BaseModel):
    user_id: UUID
    results: list[RecommendationItem]


class SkillGapResponse(BaseModel):
    career_name: str
    description: str
    you_have: list[str] = Field(default_factory=list)
    you_need: list[str] = Field(default_factory=list)
    total_required_skills: int = 0
    coverage_pct: float = 0.0
    
    # Phase 4 detailed skill gap fields
    skill_importance: dict[str, str] = Field(default_factory=dict)
    learning_sequence: list[str] = Field(default_factory=list)
