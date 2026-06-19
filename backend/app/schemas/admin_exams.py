from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from uuid import UUID

class AdminExamBase(BaseModel):
    exam_name: str
    category: str
    eligibility: str
    age_limit: str
    attempts_allowed: Optional[str] = None
    selection_process: Optional[List[str]] = None
    exam_pattern: Optional[str] = None
    syllabus: str
    salary: Optional[str] = None
    career_opportunities: Optional[str] = None
    official_website: Optional[str] = None
    difficulty_level: Optional[str] = "Medium"

class AdminExamCreate(AdminExamBase):
    pass

class AdminExamUpdate(AdminExamBase):
    pass

class AdminExamResponse(AdminExamBase):
    id: UUID
    salary_range: Optional[str] = None
    job_roles: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)

class AdminExamListResponse(BaseModel):
    items: List[AdminExamResponse]
    total: int
    page: int
    size: int
