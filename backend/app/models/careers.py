"""SQLAlchemy ORM models for careers and recommendations (Phase 3)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Career(Base):
    """Derived career cluster – seeded from the ML knowledge base."""

    __tablename__ = "careers_phase3"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    typical_skills: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    survey_count: Mapped[int | None] = mapped_column()
    
    # Phase 4 detailed fields
    category: Mapped[str | None] = mapped_column(String(150))
    overview: Mapped[str | None] = mapped_column(Text)
    eligibility: Mapped[str | None] = mapped_column(Text)
    education_required: Mapped[str | None] = mapped_column(String(200))
    salary_range: Mapped[str | None] = mapped_column(String(100))
    responsibilities: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    career_growth: Mapped[str | None] = mapped_column(Text)
    industries: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    certifications: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    future_demand_score: Mapped[int | None] = mapped_column()
    learning_roadmap: Mapped[list[dict] | None] = mapped_column(JSONB)

    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="career", cascade="all, delete-orphan")
    career_skills: Mapped[list["CareerSkill"]] = relationship(back_populates="career", cascade="all, delete-orphan")

class Recommendation(Base):
    """Persisted recommendation result for a user."""

    __tablename__ = "recommendations_phase3"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    career_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("careers_phase3.id", ondelete="SET NULL"), nullable=True)
    career_name: Mapped[str] = mapped_column(String(150))
    match_pct: Mapped[float] = mapped_column(Numeric(5, 1))
    matched_skills: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    skill_gaps: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    rank: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    career: Mapped["Career | None"] = relationship(back_populates="recommendations")
