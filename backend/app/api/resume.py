from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

from app.api.dependencies import get_current_user, DbSession
from app.models.resume import ResumeAnalyzeRequest, ResumeAnalyzeResponse
from app.ml.resume_analyzer import resume_analyzer
from app.models.analytics import AnalyticsEvent

router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/analyze", response_model=ResumeAnalyzeResponse)
async def analyze_resume(
    req: ResumeAnalyzeRequest,
    db: DbSession,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    try:
        result = resume_analyzer.analyze(req.resume_text, req.target_career)
        
        # Log analytics event
        try:
            event = AnalyticsEvent(
                event_name="resume_analysis",
                user_id=getattr(current_user, "id", None),
                properties={"target_career": req.target_career}
            )
            db.add(event)
            db.commit()
        except Exception as err:
            print("Failed to log resume analysis event:", err)
            
        return ResumeAnalyzeResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing resume: {str(e)}"
        )
