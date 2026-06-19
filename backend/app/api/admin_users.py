from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select

from app.api.dependencies import CurrentAdmin, DbSession
from app.models.auth import Profile, User
from app.models.admin import AdminAuditLog
from app.schemas.admin_users import AdminUserListResponse, AdminUserResponse, AdminUserProfileResponse, UserStatusUpdate, AdminUserCreate, AdminUserUpdate
from app.core.security import hash_password

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=AdminUserListResponse)
def list_users(
    admin: CurrentAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    status_filter: bool | None = None,
) -> AdminUserListResponse:
    query = select(User, Profile).outerjoin(Profile, User.id == Profile.user_id).where(User.is_verified == True)

    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(User.email).like(search_term),
                func.lower(Profile.name).like(search_term),
            )
        )
    if role:
        query = query.where(User.role == role)
    if status_filter is not None:
        query = query.where(User.is_active == status_filter)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = db.execute(query).all()

    users_data = []
    for user, profile in rows:
        users_data.append(
            AdminUserResponse(
                id=user.id,
                name=profile.name if profile else None,
                email=user.email,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
                last_login=user.last_login,
            )
        )

    return AdminUserListResponse(
        total=total,
        page=page,
        page_size=page_size,
        users=users_data,
    )


@router.get("/{user_id}", response_model=AdminUserProfileResponse)
def get_user(user_id: UUID, admin: CurrentAdmin, db: DbSession) -> AdminUserProfileResponse:
    row = db.execute(select(User, Profile).outerjoin(Profile, User.id == Profile.user_id).where(User.id == user_id).where(User.is_verified == True)).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    user, profile = row
    return AdminUserProfileResponse(
        id=user.id,
        name=profile.name if profile else None,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
        age=profile.age if profile else None,
        gender=profile.gender if profile else None,
        education_level=profile.education_level if profile else None,
        stream=profile.stream if profile else None,
        cgpa=profile.cgpa if profile else None,
        certifications=profile.certifications if profile else None,
        career_goals=profile.career_goals if profile else None,
        skills=profile.skills if profile else None,
        interests=profile.interests if profile else None,
    )


@router.patch("/{user_id}/status", response_model=AdminUserResponse)
def update_user_status(user_id: UUID, payload: UserStatusUpdate, admin: CurrentAdmin, db: DbSession) -> AdminUserResponse:
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own status")

    row = db.execute(select(User, Profile).outerjoin(Profile, User.id == Profile.user_id).where(User.id == user_id).where(User.is_verified == True)).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    user, profile = row
    user.is_active = payload.is_active
    
    # Log the action
    db.add(AdminAuditLog(
        admin_id=admin.id,
        action="update_status",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Status changed to {'active' if payload.is_active else 'inactive'}"
    ))
    db.commit()

    return AdminUserResponse(
        id=user.id,
        name=profile.name if profile else None,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: UUID, admin: CurrentAdmin, db: DbSession) -> None:
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    user = db.get(User, user_id)
    if not user or not user.is_verified:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    
    # Log the action
    db.add(AdminAuditLog(
        admin_id=admin.id,
        action="delete",
        entity_type="user",
        entity_id=str(user_id),
        details=f"Deleted user account {user.email}"
    ))
    db.commit()


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminUserCreate, admin: CurrentAdmin, db: DbSession) -> AdminUserResponse:
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    user.profile = Profile(name=payload.name, skills=[], interests=[], certifications=[])
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log action
    db.add(AdminAuditLog(
        admin_id=admin.id,
        action="create_user",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Created user account {user.email} as {user.role}"
    ))
    db.commit()

    return AdminUserResponse(
        id=user.id,
        name=payload.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
    )


@router.put("/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: UUID, payload: AdminUserUpdate, admin: CurrentAdmin, db: DbSession
) -> AdminUserResponse:
    user = db.get(User, user_id)
    if not user or not user.is_verified:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    email = payload.email.lower()
    # Check email duplicate
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user and existing_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Prevent self-demotion from admin
    if user_id == admin.id and payload.role != user.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )

    user.email = email
    user.role = payload.role

    if payload.password:
        user.password_hash = hash_password(payload.password)

    if not user.profile:
        user.profile = Profile(name=payload.name, skills=[], interests=[], certifications=[])
    else:
        user.profile.name = payload.name

    # Log action
    db.add(AdminAuditLog(
        admin_id=admin.id,
        action="update_user",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Updated user account {user.email} details"
    ))
    db.commit()
    db.refresh(user)

    return AdminUserResponse(
        id=user.id,
        name=user.profile.name if user.profile else None,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
    )

