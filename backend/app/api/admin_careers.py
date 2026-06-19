from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func, or_
from uuid import UUID

from app.api.dependencies import CurrentAdmin, DbSession
from app.models.careers import Career
from app.schemas.admin_careers import AdminCareerListResponse, AdminCareerResponse, AdminCareerCreate, AdminCareerUpdate

router = APIRouter(prefix="/admin/careers", tags=["admin-careers"])

@router.get("", response_model=AdminCareerListResponse)
def get_careers(
    admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category: str | None = None,
):
    print("====== REACHED GET CAREERS ======")
    query = select(Career)
    
    if search:
        query = query.where(Career.name.ilike(f"%{search}%"))
        
    if category and category != "all":
        query = query.where(Career.category == category)
        
    # Get total count
    total_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(total_query)
    
    # Get paginated results
    query = query.order_by(Career.name).offset((page - 1) * size).limit(size)
    items = db.scalars(query).all()
    
    return AdminCareerListResponse(
        items=items,
        total=total or 0,
        page=page,
        size=size
    )

@router.get("/{career_id}", response_model=AdminCareerResponse)
def get_career(career_id: UUID, admin: CurrentAdmin, db: DbSession):
    career = db.get(Career, career_id)
    if not career:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Career not found")
    return career

@router.post("", response_model=AdminCareerResponse, status_code=status.HTTP_201_CREATED)
def create_career(career_in: AdminCareerCreate, admin: CurrentAdmin, db: DbSession):
    # Check if career with name already exists
    stmt = select(Career).where(Career.name == career_in.name)
    existing = db.execute(stmt).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Career with this name already exists")
        
    career = Career(**career_in.model_dump(exclude_unset=True))
    db.add(career)
    db.commit()
    db.refresh(career)
    return career

@router.put("/{career_id}", response_model=AdminCareerResponse)
def update_career(career_id: UUID, career_in: AdminCareerUpdate, admin: CurrentAdmin, db: DbSession):
    career = db.get(Career, career_id)
    if not career:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Career not found")
        
    update_data = career_in.model_dump(exclude_unset=True)
    
    # If name is being updated, check for duplicates
    if "name" in update_data and update_data["name"] != career.name:
        stmt = select(Career).where(Career.name == update_data["name"])
        existing = db.execute(stmt).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Career with this name already exists")
            
    for field, value in update_data.items():
        setattr(career, field, value)
        
    db.commit()
    db.refresh(career)
    return career

@router.delete("/{career_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_career(career_id: UUID, admin: CurrentAdmin, db: DbSession):
    career = db.get(Career, career_id)
    if not career:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Career not found")
        
    db.delete(career)
    db.commit()
    return None
