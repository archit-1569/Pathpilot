"""Pydantic schemas for government exams (Phase 5)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ExamResponse(BaseModel):
    exam_name: str
    category: str
    eligibility: str
    age_limit: str
    selection_process: list[str] = Field(default_factory=list)
    syllabus: str
    salary_range: str
    job_roles: list[str] = Field(default_factory=list)
    difficulty_level: str
    attempts_allowed: str | None = None
    exam_pattern: str | None = None
    salary: str | None = None
    career_opportunities: str | None = None
    official_website: str | None = None

    model_config = {"from_attributes": True}
