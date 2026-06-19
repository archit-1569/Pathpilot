from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DbSession
from app.core.security import create_access_token, create_reset_token, hash_password, hash_reset_token, verify_password, generate_otp, hash_otp
from app.core.email import send_otp_email, send_reset_otp_email
from app.models.auth import PasswordResetToken, Profile, User, OTPVerification
from app.schemas.auth import ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest, TokenResponse, UserResponse, RegisterResponse, VerifyOTPRequest, ResendOTPRequest, VerifyResetOTPRequest


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> RegisterResponse:
    email = payload.email.lower()
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user:
        if existing_user.is_verified:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
        else:
            # User exists but is not verified. Update password, name, regenerate OTP.
            existing_user.password_hash = hash_password(payload.password)
            if existing_user.profile:
                existing_user.profile.name = payload.name
            else:
                existing_user.profile = Profile(name=payload.name, skills=[], interests=[], certifications=[])
            user = existing_user
            db.flush()
    else:
        user = User(email=email, password_hash=hash_password(payload.password), is_verified=False)
        user.profile = Profile(name=payload.name, skills=[], interests=[], certifications=[])
        db.add(user)
        db.flush()

    # Save/Regenerate OTP
    from sqlalchemy import delete
    db.execute(delete(OTPVerification).where(OTPVerification.user_id == user.id))

    otp = generate_otp()
    otp_hash = hash_otp(otp)
    expires_at = datetime.now(UTC) + timedelta(minutes=10)

    verification = OTPVerification(user_id=user.id, otp_hash=otp_hash, expires_at=expires_at)
    db.add(verification)
    db.commit()

    # Send SMTP email to the registered email address
    send_otp_email(email, otp)

    return RegisterResponse(message="Verification OTP sent to email", email=email)


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: VerifyOTPRequest, db: DbSession) -> TokenResponse:
    email = payload.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified")

    otp_ver = db.scalar(select(OTPVerification).where(OTPVerification.user_id == user.id))
    if not otp_ver:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active verification code found")

    if datetime.now(UTC) > otp_ver.expires_at:
        db.delete(otp_ver)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired")

    if otp_ver.otp_hash != hash_otp(payload.otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    user.is_verified = True
    db.delete(otp_ver)

    # Clear chat history so the user gets a fresh mentor session upon login/verification
    from sqlalchemy import delete
    from app.models.chat import ChatMessage
    db.execute(delete(ChatMessage).where(ChatMessage.user_id == user.id))

    user.last_login = datetime.now(UTC)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_access_token(user.id), user=user)


@router.post("/resend-otp", response_model=RegisterResponse)
def resend_otp(payload: ResendOTPRequest, db: DbSession) -> RegisterResponse:
    email = payload.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified")

    from sqlalchemy import delete
    db.execute(delete(OTPVerification).where(OTPVerification.user_id == user.id))

    otp = generate_otp()
    otp_hash = hash_otp(otp)
    expires_at = datetime.now(UTC) + timedelta(minutes=10)

    verification = OTPVerification(user_id=user.id, otp_hash=otp_hash, expires_at=expires_at)
    db.add(verification)
    db.commit()

    # Send SMTP email to the registered email address
    send_otp_email(email, otp)

    return RegisterResponse(message="Verification OTP resent", email=email)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your email address to log in")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    # Clear chat history so the user gets a fresh mentor session upon login
    from sqlalchemy import delete
    from app.models.chat import ChatMessage
    db.execute(delete(ChatMessage).where(ChatMessage.user_id == user.id))

    user.last_login = datetime.now(UTC)
    db.commit()

    return TokenResponse(access_token=create_access_token(user.id), user=user)



@router.get("/me", response_model=UserResponse)
def current_user(user: CurrentUser) -> User:
    return user


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: DbSession) -> dict[str, str]:
    email = payload.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    # Return generic success even if user not found for security
    response = {"message": "If the account exists, a verification code has been sent."}
    if not user:
        return response

    # Clean up any previous reset tokens for this user
    from sqlalchemy import delete
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))

    # Generate OTP and a temporary unique token hash (to satisfy unique constraint)
    import secrets
    otp = generate_otp()
    temp_token = secrets.token_urlsafe(32)
    temp_token_hash = hash_reset_token(temp_token)

    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=temp_token_hash,
        otp_hash=hash_otp(otp),
        is_otp_verified=False,
        expires_at=datetime.now(UTC) + timedelta(minutes=15)
    ))
    db.commit()

    # Email the OTP code to the user
    send_reset_otp_email(email, otp)

    return response


@router.post("/verify-reset-otp")
def verify_reset_otp(payload: VerifyResetOTPRequest, db: DbSession) -> dict[str, str]:
    email = payload.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code is invalid or expired")

    now = datetime.now(UTC)
    reset = db.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id)
        .where(PasswordResetToken.otp_hash == hash_otp(payload.otp))
        .where(PasswordResetToken.expires_at > now)
        .where(PasswordResetToken.used_at.is_(None))
    )
    if not reset:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code is invalid or expired")

    # Generate actual reset token and hash
    token, token_hash = create_reset_token()
    
    # Update token record
    reset.token_hash = token_hash
    reset.is_otp_verified = True
    reset.expires_at = datetime.now(UTC) + timedelta(minutes=5)  # 5 minutes to complete the reset
    db.commit()

    return {"reset_token": token}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: DbSession) -> dict[str, str]:
    reset = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_reset_token(payload.token)))
    now = datetime.now(UTC)
    if not reset or reset.used_at or reset.expires_at < now or not reset.is_otp_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token is invalid or expired")

    user = db.get(User, reset.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token is invalid")
    
    user.password_hash = hash_password(payload.new_password)
    reset.used_at = now
    db.commit()
    return {"message": "Password updated successfully"}
