from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.api.dependencies import CurrentAdmin, DbSession
from app.models.skills import Skill, CareerSkill
from app.models.careers import Career
from app.schemas.admin_skills import (
    SkillListResponse, SkillResponse, SkillCreate, SkillUpdate, SkillCareerMapping
)

router = APIRouter(prefix="/admin/skills", tags=["admin-skills"])

@router.get("", response_model=SkillListResponse)
def get_skills(
    admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category: str | None = None,
):
    query = select(Skill).options(selectinload(Skill.career_skills).selectinload(CareerSkill.career))
    
    if search:
        query = query.where(Skill.name.ilike(f"%{search}%"))
        
    if category and category != "all":
        query = query.where(Skill.category == category)
        
    total_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(total_query)
    
    query = query.order_by(Skill.name).offset((page - 1) * size).limit(size)
    items = db.scalars(query).all()
    
    result_items = []
    for skill in items:
        mappings = []
        for cs in skill.career_skills:
            mappings.append(SkillCareerMapping(
                career_id=cs.career_id,
                career_name=cs.career.name,
                proficiency_level=cs.proficiency_level
            ))
            
        data = {col.name: getattr(skill, col.name) for col in skill.__table__.columns}
        data["linked_careers"] = mappings
        result_items.append(SkillResponse(**data))
    
    return SkillListResponse(
        items=result_items,
        total=total or 0,
        page=page,
        size=size
    )

@router.get("/{skill_id}", response_model=SkillResponse)
def get_skill(skill_id: UUID, admin: CurrentAdmin, db: DbSession):
    query = select(Skill).where(Skill.id == skill_id).options(selectinload(Skill.career_skills).selectinload(CareerSkill.career))
    skill = db.scalar(query)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
        
    mappings = []
    for cs in skill.career_skills:
        mappings.append(SkillCareerMapping(
            career_id=cs.career_id,
            career_name=cs.career.name,
            proficiency_level=cs.proficiency_level
        ))
        
    data = {col.name: getattr(skill, col.name) for col in skill.__table__.columns}
    data["linked_careers"] = mappings
    return SkillResponse(**data)

@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_skill(skill_in: SkillCreate, admin: CurrentAdmin, db: DbSession):
    stmt = select(Skill).where(Skill.name.ilike(skill_in.name))
    existing = db.execute(stmt).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill with this name already exists")
        
    skill = Skill(**skill_in.model_dump(exclude_unset=True))
    db.add(skill)
    db.commit()
    db.refresh(skill)
    
    data = {col.name: getattr(skill, col.name) for col in skill.__table__.columns}
    data["linked_careers"] = []
    return SkillResponse(**data)

@router.put("/{skill_id}", response_model=SkillResponse)
def update_skill(skill_id: UUID, skill_in: SkillUpdate, admin: CurrentAdmin, db: DbSession):
    query = select(Skill).where(Skill.id == skill_id).options(selectinload(Skill.career_skills).selectinload(CareerSkill.career))
    skill = db.scalar(query)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
        
    update_data = skill_in.model_dump(exclude_unset=True)
    
    if "name" in update_data and update_data["name"].lower() != skill.name.lower():
        stmt = select(Skill).where(Skill.name.ilike(update_data["name"]))
        existing = db.execute(stmt).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill with this name already exists")
            
    for field, value in update_data.items():
        setattr(skill, field, value)
        
    db.commit()
    db.refresh(skill)
    
    mappings = []
    for cs in skill.career_skills:
        mappings.append(SkillCareerMapping(
            career_id=cs.career_id,
            career_name=cs.career.name,
            proficiency_level=cs.proficiency_level
        ))
        
    data = {col.name: getattr(skill, col.name) for col in skill.__table__.columns}
    data["linked_careers"] = mappings
    return SkillResponse(**data)

@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(skill_id: UUID, admin: CurrentAdmin, db: DbSession):
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
        
    db.delete(skill)
    db.commit()
    return None

# Mapping endpoints
@router.post("/{skill_id}/careers/{career_id}", status_code=status.HTTP_200_OK)
def link_career_to_skill(skill_id: UUID, career_id: UUID, admin: CurrentAdmin, db: DbSession):
    skill = db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
        
    career = db.get(Career, career_id)
    if not career:
        raise HTTPException(status_code=404, detail="Career not found")
        
    stmt = select(CareerSkill).where(CareerSkill.skill_id == skill_id, CareerSkill.career_id == career_id)
    mapping = db.scalar(stmt)
    
    if not mapping:
        mapping = CareerSkill(skill_id=skill_id, career_id=career_id, importance=1)
        db.add(mapping)
        db.commit()
        
    return {"status": "linked"}

@router.delete("/{skill_id}/careers/{career_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_career_from_skill(skill_id: UUID, career_id: UUID, admin: CurrentAdmin, db: DbSession):
    stmt = select(CareerSkill).where(CareerSkill.skill_id == skill_id, CareerSkill.career_id == career_id)
    mapping = db.scalar(stmt)
    
    if mapping:
        db.delete(mapping)
        db.commit()
        
    return None
