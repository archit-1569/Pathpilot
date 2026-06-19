"""Pydantic schemas for learning roadmaps (Phase 5)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class RoadmapSkill(BaseModel):
    name: str
    acquired: bool  # True if the user already has this skill


class RoadmapStage(BaseModel):
    stage: str          # e.g. "Beginner"
    title: str          # e.g. "Fundamentals"
    skills: list[RoadmapSkill] = Field(default_factory=list)
    completed: bool = False  # True if ALL skills in stage are acquired


class RoadmapResponse(BaseModel):
    career_name: str
    description: str
    total_skills: int
    acquired_skills: int
    completion_pct: float
    stages: list[RoadmapStage] = Field(default_factory=list)
