from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class AdminUserResponse(BaseModel):
    id: UUID
    name: str | None = None
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    last_login: datetime | None = None

    model_config = {"from_attributes": True}


class AdminUserProfileResponse(AdminUserResponse):
    age: int | None = None
    gender: str | None = None
    education_level: str | None = None
    stream: str | None = None
    cgpa: float | None = None
    certifications: list[str] | None = None
    career_goals: str | None = None
    skills: list[str] | None = None
    interests: list[str] | None = None


class AdminUserListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    users: list[AdminUserResponse]


class UserStatusUpdate(BaseModel):
    is_active: bool


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field("student", pattern="^(student|admin)$")
    name: str = Field(..., min_length=2, max_length=120)


class AdminUserUpdate(BaseModel):
    email: EmailStr
    role: str = Field("student", pattern="^(student|admin)$")
    name: str = Field(..., min_length=2, max_length=120)
    password: str | None = Field(None, min_length=8)

