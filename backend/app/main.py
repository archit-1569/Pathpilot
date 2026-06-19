from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.careers import router as careers_router
from app.api.chat import router as chat_router
from app.api.exams import router as exams_router
from app.api.health import router as health_router
from app.api.profiles import router as profiles_router
from app.api.recommendations import router as recommendations_router
from app.api.roadmaps import router as roadmaps_router
from app.api.skill_gaps import router as skill_gaps_router
from app.api.resume import router as resume_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
import json
from pathlib import Path

# Import models so SQLAlchemy registers them before create_all
import app.models  # noqa: F401  – side-effect import


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.7.0",
    description="Phase 7: AI Career Mentor chat feature for PathPilot AI.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.admin_users import router as admin_users_router
from app.api.admin_careers import router as admin_careers_router
from app.api.admin_skills import router as admin_skills_router
from app.api.admin_exams import router as admin_exams_router
from app.api.admin_analytics import router as admin_analytics_router
from app.api.admin_settings import router as admin_settings_router

app.include_router(health_router, prefix=settings.api_v1_prefix)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(profiles_router, prefix=settings.api_v1_prefix)
app.include_router(careers_router, prefix=settings.api_v1_prefix)
app.include_router(admin_users_router, prefix=settings.api_v1_prefix)
app.include_router(admin_careers_router, prefix=settings.api_v1_prefix)
app.include_router(admin_skills_router, prefix=settings.api_v1_prefix)
app.include_router(admin_exams_router, prefix=settings.api_v1_prefix)
app.include_router(admin_analytics_router, prefix=settings.api_v1_prefix)
app.include_router(admin_settings_router, prefix=settings.api_v1_prefix)
app.include_router(recommendations_router, prefix=settings.api_v1_prefix)
app.include_router(skill_gaps_router, prefix=settings.api_v1_prefix)
app.include_router(exams_router, prefix=settings.api_v1_prefix)
app.include_router(roadmaps_router, prefix=settings.api_v1_prefix)
app.include_router(chat_router, prefix=settings.api_v1_prefix)
app.include_router(resume_router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def create_tables() -> None:
    """Create any missing tables and seed exam data (idempotent)."""
    Base.metadata.create_all(bind=engine)
    _seed_exams()


def _seed_exams() -> None:
    """Populate the exams table from exams_seed.json if it is empty."""
    from sqlalchemy.orm import Session
    from app.models.exams import Exam

    seed_path = Path(__file__).resolve().parents[1] / "data" / "exams_seed.json"
    if not seed_path.exists():
        return

    with Session(engine) as db:
        if db.query(Exam).count() > 0:
            return  # already seeded
        with open(seed_path, "r", encoding="utf-8") as f:
            exams_data = json.load(f)
        for item in exams_data:
            db.add(Exam(
                exam_name=item["exam_name"],
                category=item["category"],
                eligibility=item["eligibility"],
                age_limit=item["age_limit"],
                selection_process=item["selection_process"],
                syllabus=item["syllabus"],
                salary_range=item["salary_range"],
                job_roles=item["job_roles"],
                difficulty_level=item["difficulty_level"],
            ))
        db.commit()


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "PathPilot AI API",
        "docs": "/docs",
        "health": f"{settings.api_v1_prefix}/health",
        "careers": f"{settings.api_v1_prefix}/careers",
        "recommendations": f"{settings.api_v1_prefix}/recommendations",
    }

# Reload touch comment update 1
