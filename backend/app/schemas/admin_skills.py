from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from uuid import UUID

class SkillBase(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None

class SkillCreate(SkillBase):
    pass

class SkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

class SkillCareerMapping(BaseModel):
    career_id: UUID
    career_name: str
    proficiency_level: Optional[str] = None

class SkillResponse(SkillBase):
    id: UUID
    
    # We can include basic linked careers info
    linked_careers: List[SkillCareerMapping] = []
    
    model_config = ConfigDict(from_attributes=True)

class SkillListResponse(BaseModel):
    items: List[SkillResponse]
    total: int
    page: int
    size: int

class CareerSkillLinkCreate(BaseModel):
    skill_id: UUID
    proficiency_level: Optional[str] = None
