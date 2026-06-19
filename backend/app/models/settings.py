import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Platform Settings
    platform_name: Mapped[str] = mapped_column(String(100), default="PathPilot AI")
    contact_email: Mapped[str] = mapped_column(String(255), default="support@pathpilot.ai")
    maintenance_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_registration: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Recommendation Engine Settings
    min_match_threshold: Mapped[float] = mapped_column(Numeric(5, 2), default=50.00)
    skills_weight: Mapped[float] = mapped_column(Numeric(3, 2), default=0.40)
    interests_weight: Mapped[float] = mapped_column(Numeric(3, 2), default=0.40)
    education_weight: Mapped[float] = mapped_column(Numeric(3, 2), default=0.20)
    
    # AI Model Settings
    ai_provider: Mapped[str] = mapped_column(String(50), default="gemini")
    ai_model: Mapped[str] = mapped_column(String(100), default="gemini-1.5-flash")
    ai_temperature: Mapped[float] = mapped_column(Numeric(3, 2), default=0.70)
    ai_system_prompt: Mapped[str] = mapped_column(Text, default="You are an AI Career Mentor for PathPilot AI. Guide the user based on their skills, interests, and aspirations.")
    
    # API Key Management
    openai_api_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gemini_api_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    other_api_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
