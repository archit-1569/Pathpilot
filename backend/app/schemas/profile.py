from uuid import UUID

from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    age: int | None = Field(default=None, ge=13, le=100)
    gender: str | None = Field(default=None, max_length=40)
    education_level: str | None = Field(default=None, max_length=100)
    stream: str | None = Field(default=None, max_length=120)
    cgpa: float | None = Field(default=None, ge=0, le=10)
    skills: list[str] | None = None
    interests: list[str] | None = None
    certifications: list[str] | None = None
    career_goals: str | None = None


class ProfileResponse(ProfileUpdate):
    id: UUID
    user_id: UUID
    name: str
    skills: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}
