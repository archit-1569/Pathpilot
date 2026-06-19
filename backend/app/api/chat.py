"""
AI Mentor chat endpoints (Phase 7):
  POST   /api/v1/chat          — send a message, get a mentor response
  GET    /api/v1/chat/history  — last 50 messages for the current user
  DELETE /api/v1/chat/history  — clear the current user's chat history
"""
from __future__ import annotations

from sqlalchemy import delete, select

from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, DbSession
from app.ml.mentor import UserContext, get_mentor
from app.models.auth import Profile
from app.models.careers import Recommendation
from app.models.chat import ChatMessage
from app.schemas.chat import ChatHistoryResponse, ChatMessageResponse, ChatRequest

router = APIRouter(prefix="/chat", tags=["mentor"])

_HISTORY_LIMIT = 50


def _build_user_context(user, db: DbSession) -> UserContext:
    """Pull profile + latest recommendations into a UserContext snapshot."""
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    recs = db.scalars(
        select(Recommendation)
        .where(Recommendation.user_id == user.id)
        .order_by(Recommendation.rank)
        .limit(5)
    ).all()

    return UserContext(
        name=profile.name if profile else user.email.split("@")[0],
        skills=list(profile.skills or []) if profile else [],
        interests=list(profile.interests or []) if profile else [],
        cgpa=float(profile.cgpa) if profile and profile.cgpa else None,
        certifications=list(profile.certifications or []) if profile else [],
        career_goals=profile.career_goals or "" if profile else "",
        top_careers=[
            {
                "career_name": r.career_name,
                "match_pct": float(r.match_pct),
                "description": "",
            }
            for r in recs
        ],
    )


@router.post("", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(payload: ChatRequest, user: CurrentUser, db: DbSession) -> ChatMessageResponse:
    """Send a message to the AI mentor and receive a personalised response."""
    # Persist user message
    user_msg = ChatMessage(user_id=user.id, role="user", content=payload.message.strip())
    db.add(user_msg)
    db.flush()  # get user_msg.id & created_at without committing

    # Build context and generate response
    ctx = _build_user_context(user, db)
    mentor = get_mentor()
    
    # Fetch last bot message for context
    last_bot_msg_row = db.scalar(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id, ChatMessage.role == "assistant")
        .order_by(ChatMessage.created_at.desc())
        .limit(1)
    )
    last_bot_msg = last_bot_msg_row.content if last_bot_msg_row else None
    
    reply_text = mentor.respond(payload.message, ctx, last_bot_msg)

    # Persist assistant response
    assistant_msg = ChatMessage(user_id=user.id, role="assistant", content=reply_text)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return ChatMessageResponse.model_validate(assistant_msg)


@router.get("/history", response_model=ChatHistoryResponse)
def get_history(user: CurrentUser, db: DbSession) -> ChatHistoryResponse:
    """Return the last 50 chat messages for the current user."""
    rows = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at)
        .limit(_HISTORY_LIMIT)
    ).all()
    return ChatHistoryResponse(messages=[ChatMessageResponse.model_validate(r) for r in rows])


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(user: CurrentUser, db: DbSession) -> None:
    """Delete all chat messages for the current user (start a new chat)."""
    db.execute(delete(ChatMessage).where(ChatMessage.user_id == user.id))
    db.commit()
