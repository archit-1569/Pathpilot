from fastapi import APIRouter
from sqlalchemy import select, func, desc
from app.api.dependencies import CurrentAdmin, DbSession
from app.models.auth import User, Profile
from app.models.careers import Recommendation
from app.models.chat import ChatMessage
from app.models.analytics import AnalyticsEvent
from app.schemas.admin_analytics import (
    KPIResponse, AnalyticsChartsResponse, UserGrowthDataPoint,
    CareerRecommendationDataPoint, ExamViewDataPoint, SkillSelectionDataPoint
)

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])

@router.get("/kpis", response_model=KPIResponse)
def get_kpis(admin: CurrentAdmin, db: DbSession):
    total_users = db.scalar(select(func.count(User.id)).where(User.is_verified == True)) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.is_active == True).where(User.is_verified == True)) or 0
    recommendations_generated = db.scalar(select(func.count(Recommendation.id))) or 0
    resume_analyses = db.scalar(select(func.count(AnalyticsEvent.id)).where(AnalyticsEvent.event_name == "resume_analysis")) or 0
    exam_views = db.scalar(select(func.count(AnalyticsEvent.id)).where(AnalyticsEvent.event_name == "exam_view")) or 0
    ai_mentor_conversations = db.scalar(select(func.count(func.distinct(ChatMessage.user_id)))) or 0

    return KPIResponse(
        total_users=total_users,
        active_users=active_users,
        recommendations_generated=recommendations_generated,
        resume_analyses=resume_analyses,
        exam_views=exam_views,
        ai_mentor_conversations=ai_mentor_conversations
    )

@router.get("/charts", response_model=AnalyticsChartsResponse)
def get_charts(admin: CurrentAdmin, db: DbSession):
    # 1. User Growth (group by date)
    user_growth_stmt = select(
        func.date(User.created_at).label("date"),
        func.count(User.id).label("count")
    ).where(User.is_verified == True).group_by(
        "date"
    ).order_by(
        "date"
    )
    user_growth_res = db.execute(user_growth_stmt).all()
    user_growth = [
        UserGrowthDataPoint(date=str(row.date), count=row.count)
        for row in user_growth_res
    ]

    # 2. Recommended Careers (Top 5)
    rec_careers_stmt = select(
        Recommendation.career_name.label("career_name"),
        func.count(Recommendation.id).label("count")
    ).group_by(
        "career_name"
    ).order_by(
        desc("count")
    ).limit(5)
    rec_careers_res = db.execute(rec_careers_stmt).all()
    recommended_careers = [
        CareerRecommendationDataPoint(career_name=row.career_name, count=row.count)
        for row in rec_careers_res
    ]

    # 3. Viewed Exams (Top 5)
    viewed_exams_stmt = select(
        AnalyticsEvent.properties["exam_name"].astext.label("exam_name"),
        func.count(AnalyticsEvent.id).label("count")
    ).where(
        AnalyticsEvent.event_name == "exam_view"
    ).group_by(
        "exam_name"
    ).order_by(
        desc("count")
    ).limit(5)
    viewed_exams_res = db.execute(viewed_exams_stmt).all()
    viewed_exams = [
        ExamViewDataPoint(exam_name=row.exam_name or "Unknown", count=row.count)
        for row in viewed_exams_res
    ]

    # 4. Selected Skills (Top 5)
    selected_skills_stmt = select(
        func.unnest(Profile.skills).label("skill_name"),
        func.count(Profile.id).label("count")
    ).join(User, Profile.user_id == User.id).where(
        Profile.skills != None,
        User.is_verified == True
    ).group_by(
        "skill_name"
    ).order_by(
        desc("count")
    ).limit(5)
    
    try:
        selected_skills_res = db.execute(selected_skills_stmt).all()
        selected_skills = [
            SkillSelectionDataPoint(skill_name=row.skill_name, count=row.count)
            for row in selected_skills_res
        ]
    except Exception as e:
        print("Failed to unnest selected skills:", e)
        selected_skills = []

    return AnalyticsChartsResponse(
        user_growth=user_growth,
        recommended_careers=recommended_careers,
        viewed_exams=viewed_exams,
        selected_skills=selected_skills
    )
