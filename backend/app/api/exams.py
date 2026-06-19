"""
GET /api/v1/exams           — list all government exams (optional ?category= filter)
GET /api/v1/exams/{name}    — get details for a single exam
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.dependencies import DbSession
from app.models.exams import Exam
from app.schemas.exams import ExamResponse


router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("", response_model=list[ExamResponse])
def list_exams(
    db: DbSession,
    category: str | None = Query(None, description="Filter by category (e.g. 'Banking', 'Defence')"),
) -> list[ExamResponse]:
    """Return all exams, optionally filtered by category."""
    stmt = select(Exam).order_by(Exam.difficulty_level, Exam.exam_name)
    if category:
        stmt = stmt.where(Exam.category.ilike(f"%{category}%"))
    exams = db.scalars(stmt).all()
    return [ExamResponse.model_validate(e) for e in exams]


@router.get("/{exam_name:path}", response_model=ExamResponse)
def get_exam(exam_name: str, db: DbSession) -> ExamResponse:
    """Return full details for a single exam matched by name (case-insensitive)."""
    exam = db.scalar(
        select(Exam).where(Exam.exam_name.ilike(exam_name))
    )
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
        
    # Log analytics event
    try:
        from app.models.analytics import AnalyticsEvent
        event = AnalyticsEvent(
            event_name="exam_view",
            properties={"exam_name": exam.exam_name}
        )
        db.add(event)
        db.commit()
    except Exception as err:
        print("Failed to log exam view event:", err)
        
    return ExamResponse.model_validate(exam)
