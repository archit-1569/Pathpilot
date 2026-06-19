from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


class SystemSettingsResponse(BaseModel):
    id: UUID
    platform_name: str
    contact_email: EmailStr
    maintenance_mode: bool
    allow_registration: bool
    min_match_threshold: float
    skills_weight: float
    interests_weight: float
    education_weight: float
    ai_provider: str
    ai_model: str
    ai_temperature: float
    ai_system_prompt: str
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    other_api_key: str | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def mask_keys(self) -> "SystemSettingsResponse":
        if self.openai_api_key:
            self.openai_api_key = "••••••••••••••••"
        if self.gemini_api_key:
            self.gemini_api_key = "••••••••••••••••"
        if self.other_api_key:
            self.other_api_key = "••••••••••••••••"
        return self


class SystemSettingsUpdate(BaseModel):
    platform_name: str = Field(..., min_length=1, max_length=100)
    contact_email: EmailStr
    maintenance_mode: bool
    allow_registration: bool
    min_match_threshold: float = Field(..., ge=0.0, le=100.0)
    skills_weight: float = Field(..., ge=0.0, le=1.0)
    interests_weight: float = Field(..., ge=0.0, le=1.0)
    education_weight: float = Field(..., ge=0.0, le=1.0)
    ai_provider: str = Field(..., min_length=1, max_length=50)
    ai_model: str = Field(..., min_length=1, max_length=100)
    ai_temperature: float = Field(..., ge=0.0, le=2.0)
    ai_system_prompt: str
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    other_api_key: str | None = None

    @model_validator(mode="after")
    def validate_weights(self) -> "SystemSettingsUpdate":
        total_weight = self.skills_weight + self.interests_weight + self.education_weight
        if abs(total_weight - 1.0) > 1e-4:
            raise ValueError("The sum of skills_weight, interests_weight, and education_weight must be exactly 1.0 (100%)")
        return self
