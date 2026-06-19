from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict
from uuid import UUID

class CareerBase(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    overview: Optional[str] = None
    eligibility: Optional[str] = None
    education_required: Optional[str] = None
    salary_range: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    career_growth: Optional[str] = None
    industries: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    typical_skills: Optional[List[str]] = None
    future_demand_score: Optional[int] = None
    learning_roadmap: Optional[List[Dict[str, Any]]] = None

class AdminCareerCreate(CareerBase):
    pass

class AdminCareerUpdate(CareerBase):
    pass

class AdminCareerResponse(CareerBase):
    id: UUID
    survey_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class AdminCareerListResponse(BaseModel):
    items: List[AdminCareerResponse]
    total: int
    page: int
    size: int
