"""SQLAlchemy ORM model for Government Exams (Phase 5)."""
from __future__ import annotations

import uuid

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Exam(Base):
    """A government or competitive exam entry seeded from exams_seed.json."""

    __tablename__ = "exams_phase5"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    eligibility: Mapped[str] = mapped_column(Text)
    age_limit: Mapped[str] = mapped_column(String(100))
    selection_process: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    syllabus: Mapped[str] = mapped_column(Text)
    salary_range: Mapped[str] = mapped_column(String(150))
    job_roles: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    difficulty_level: Mapped[str] = mapped_column(String(50))
    attempts_allowed: Mapped[str | None] = mapped_column(Text, nullable=True)
    exam_pattern: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary: Mapped[str | None] = mapped_column(String(150), nullable=True)
    career_opportunities: Mapped[str | None] = mapped_column(Text, nullable=True)
    official_website: Mapped[str | None] = mapped_column(String(255), nullable=True)
