from __future__ import annotations

import uuid
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class Skill(Base):
    """A standalone skill that can be assigned to multiple careers."""
    
    __tablename__ = "skills"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    category: Mapped[str | None] = mapped_column(String(50)) # e.g. Hard Skill, Soft Skill, Tool
    description: Mapped[str | None] = mapped_column(Text)
    
    career_skills: Mapped[list["CareerSkill"]] = relationship(back_populates="skill", cascade="all, delete-orphan")


class CareerSkill(Base):
    """Junction table mapping careers to skills."""
    
    __tablename__ = "career_skills"
    
    career_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("careers_phase3.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    
    importance: Mapped[int] = mapped_column(default=1) # SMALLINT in DB, NOT NULL
    proficiency_level: Mapped[str | None] = mapped_column(String(50)) # e.g. Beginner, Intermediate, Expert
    
    career: Mapped["Career"] = relationship(back_populates="career_skills")
    skill: Mapped["Skill"] = relationship(back_populates="career_skills")
