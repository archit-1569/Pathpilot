"""GET /api/v1/careers — list all derived career profiles from the knowledge base."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.dependencies import DbSession
from app.models.careers import Career
from app.schemas.careers import CareerResponse


router = APIRouter(prefix="/careers", tags=["careers"])


@router.get("", response_model=list[CareerResponse])
def list_careers(db: DbSession) -> list[CareerResponse]:
    """Return all career clusters from the database."""
    query = select(Career).order_by(Career.name)
    careers = db.scalars(query).all()
    
    # Map 'name' from DB to 'career_name' for the schema
    result = []
    for c in careers:
        data = {col.name: getattr(c, col.name) for col in c.__table__.columns}
        data["career_name"] = data.pop("name")
        
        # Provide fallbacks for fields that Pydantic expects to be non-None
        if data.get("survey_count") is None:
            data["survey_count"] = 0
        if data.get("typical_skills") is None:
            data["typical_skills"] = []
        if data.get("responsibilities") is None:
            data["responsibilities"] = []
        if data.get("industries") is None:
            data["industries"] = []
        if data.get("certifications") is None:
            data["certifications"] = []
        if data.get("learning_roadmap") is None:
            data["learning_roadmap"] = []
            
        result.append(CareerResponse(**data))
    return result


@router.get("/{career_name:path}", response_model=CareerResponse)
def get_career(career_name: str, db: DbSession) -> CareerResponse:
    """Return details of a single career cluster (matched by name, case-insensitive)."""
    query = select(Career).where(Career.name.ilike(career_name))
    c = db.scalar(query)
    
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Career not found")
        
    data = {col.name: getattr(c, col.name) for col in c.__table__.columns}
    data["career_name"] = data.pop("name")
    
    if data.get("survey_count") is None:
        data["survey_count"] = 0
    if data.get("typical_skills") is None:
        data["typical_skills"] = []
    if data.get("responsibilities") is None:
        data["responsibilities"] = []
    if data.get("industries") is None:
        data["industries"] = []
    if data.get("certifications") is None:
        data["certifications"] = []
    if data.get("learning_roadmap") is None:
        data["learning_roadmap"] = []
        
    return CareerResponse(**data)
