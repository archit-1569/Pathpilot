from typing import List
from pydantic import BaseModel

class KPIResponse(BaseModel):
    total_users: int
    active_users: int
    recommendations_generated: int
    resume_analyses: int
    exam_views: int
    ai_mentor_conversations: int

class UserGrowthDataPoint(BaseModel):
    date: str
    count: int

class CareerRecommendationDataPoint(BaseModel):
    career_name: str
    count: int

class ExamViewDataPoint(BaseModel):
    exam_name: str
    count: int

class SkillSelectionDataPoint(BaseModel):
    skill_name: str
    count: int

class AnalyticsChartsResponse(BaseModel):
    user_growth: List[UserGrowthDataPoint]
    recommended_careers: List[CareerRecommendationDataPoint]
    viewed_exams: List[ExamViewDataPoint]
    selected_skills: List[SkillSelectionDataPoint]
