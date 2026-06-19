from pydantic import BaseModel, Field

class ResumeAnalyzeRequest(BaseModel):
    resume_text: str = Field(..., description="The raw text content of the user's resume")
    target_career: str = Field(..., description="The specific career the user is targeting")

class ResumeAnalyzeResponse(BaseModel):
    score: int = Field(..., description="ATS Match Score out of 100")
    matching_skills: list[str] = Field(..., description="Skills found in the resume that match the target career")
    missing_skills: list[str] = Field(..., description="Skills required by the target career but missing from the resume")
    formatting_feedback: list[str] = Field(..., description="Actionable tips on improving the resume content and format")
