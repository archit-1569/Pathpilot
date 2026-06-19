from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func
from uuid import UUID

from app.api.dependencies import CurrentAdmin, DbSession
from app.models.exams import Exam
from app.schemas.admin_exams import (
    AdminExamListResponse, AdminExamResponse, AdminExamCreate, AdminExamUpdate
)

router = APIRouter(prefix="/admin/exams", tags=["admin-exams"])

@router.get("", response_model=AdminExamListResponse)
def get_exams(
    admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category: str | None = None,
):
    query = select(Exam)
    
    if search:
        query = query.where(Exam.exam_name.ilike(f"%{search}%"))
        
    if category and category != "all":
        query = query.where(Exam.category == category)
        
    # Get total count
    total_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(total_query)
    
    # Get paginated results
    query = query.order_by(Exam.exam_name).offset((page - 1) * size).limit(size)
    items = db.scalars(query).all()
    
    return AdminExamListResponse(
        items=items,
        total=total or 0,
        page=page,
        size=size
    )

@router.get("/{exam_id}", response_model=AdminExamResponse)
def get_exam(exam_id: UUID, admin: CurrentAdmin, db: DbSession):
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    return exam

@router.post("", response_model=AdminExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(exam_in: AdminExamCreate, admin: CurrentAdmin, db: DbSession):
    # Check if exam with name already exists
    stmt = select(Exam).where(Exam.exam_name.ilike(exam_in.exam_name))
    existing = db.execute(stmt).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exam with this name already exists")
        
    # Synchronize legacy fields
    data = exam_in.model_dump(exclude_unset=True)
    if "salary" in data:
        data["salary_range"] = data["salary"]
    if "career_opportunities" in data and data["career_opportunities"]:
        data["job_roles"] = [r.strip() for r in data["career_opportunities"].split(",") if r.strip()]
    else:
        data["job_roles"] = []
        
    exam = Exam(**data)
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam

@router.put("/{exam_id}", response_model=AdminExamResponse)
def update_exam(exam_id: UUID, exam_in: AdminExamUpdate, admin: CurrentAdmin, db: DbSession):
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        
    update_data = exam_in.model_dump(exclude_unset=True)
    
    # Check for name duplicates if name is changing
    if "exam_name" in update_data and update_data["exam_name"].lower() != exam.exam_name.lower():
        stmt = select(Exam).where(Exam.exam_name.ilike(update_data["exam_name"]))
        existing = db.execute(stmt).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exam with this name already exists")
            
    # Synchronize legacy fields
    if "salary" in update_data:
        update_data["salary_range"] = update_data["salary"]
    if "career_opportunities" in update_data:
        if update_data["career_opportunities"]:
            update_data["job_roles"] = [r.strip() for r in update_data["career_opportunities"].split(",") if r.strip()]
        else:
            update_data["job_roles"] = []
            
    for field, value in update_data.items():
        setattr(exam, field, value)
        
    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(exam_id: UUID, admin: CurrentAdmin, db: DbSession):
    exam = db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        
    db.delete(exam)
    db.commit()
    return None
