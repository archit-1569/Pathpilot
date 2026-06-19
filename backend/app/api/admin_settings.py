from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.dependencies import CurrentAdmin, DbSession
from app.models.settings import SystemSettings
from app.schemas.admin_settings import SystemSettingsResponse, SystemSettingsUpdate

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])


def _get_or_create_settings(db: DbSession) -> SystemSettings:
    settings = db.scalar(select(SystemSettings))
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=SystemSettingsResponse)
def get_settings(admin: CurrentAdmin, db: DbSession) -> SystemSettings:
    return _get_or_create_settings(db)


@router.put("", response_model=SystemSettingsResponse)
def update_settings(
    payload: SystemSettingsUpdate, admin: CurrentAdmin, db: DbSession
) -> SystemSettings:
    settings = _get_or_create_settings(db)
    
    settings.platform_name = payload.platform_name
    settings.contact_email = payload.contact_email
    settings.maintenance_mode = payload.maintenance_mode
    settings.allow_registration = payload.allow_registration
    
    settings.min_match_threshold = payload.min_match_threshold
    settings.skills_weight = payload.skills_weight
    settings.interests_weight = payload.interests_weight
    settings.education_weight = payload.education_weight
    
    settings.ai_provider = payload.ai_provider
    settings.ai_model = payload.ai_model
    settings.ai_temperature = payload.ai_temperature
    settings.ai_system_prompt = payload.ai_system_prompt
    
    # Preserve key if not touched (masked)
    if payload.openai_api_key != "••••••••••••••••":
        settings.openai_api_key = payload.openai_api_key
    if payload.gemini_api_key != "••••••••••••••••":
        settings.gemini_api_key = payload.gemini_api_key
    if payload.other_api_key != "••••••••••••••••":
        settings.other_api_key = payload.other_api_key
        
    db.commit()
    db.refresh(settings)
    return settings
