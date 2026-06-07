from fastapi import APIRouter, Depends, Response, Request, Cookie, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import (
    RegisterRequest, LoginRequest, VerifyEmailRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    TokenResponse, UserResponse, UpdateProfileRequest,
)
from app.services import auth_service
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.utils.email import send_verification_email, send_otp_email
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user, verify_token = await auth_service.register_user(db, body.email, body.password)
    await send_verification_email(body.email, verify_token, settings.frontend_origin)
    return {"message": "Registration successful. Check your email to verify your account."}


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.verify_email(db, body.token)
    return {"message": "Email verified successfully"}


@router.post("/login")
@limiter.limit("5/15minutes")
async def login(request: Request, body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user_agent = request.headers.get("user-agent", "")
    access_token, refresh_token, user_id = await auth_service.login_user(db, body.email, body.password, user_agent)

    is_prod = settings.environment == "production"
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="none" if is_prod else "strict",
        secure=is_prod,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth/refresh",
    )
    response.set_cookie(
        key="uid",
        value=user_id,
        httponly=True,
        samesite="none" if is_prod else "strict",
        secure=is_prod,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )
    return TokenResponse(access_token=access_token)


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    uid: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token or not uid:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    user_agent = request.headers.get("user-agent", "")
    new_access, new_refresh = await auth_service.refresh_access_token(db, refresh_token, uid, user_agent)

    is_prod = settings.environment == "production"
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        samesite="none" if is_prod else "strict",
        secure=is_prod,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth/refresh",
    )
    return TokenResponse(access_token=new_access)


@router.post("/logout")
async def logout(request: Request, response: Response, current_user: User = Depends(get_current_user)):
    user_agent = request.headers.get("user-agent", "")
    await auth_service.logout_user(str(current_user.id), user_agent)
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")
    response.delete_cookie("uid", path="/api/v1/auth")
    return {"message": "Logged out"}


@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    otp = await auth_service.send_password_reset_otp(db, body.email)
    if otp:
        await send_otp_email(body.email, otp)
    return {"message": "If that email exists, an OTP has been sent"}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.reset_password(db, body.email, body.otp, body.new_password)
    return {"message": "Password reset successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.preferred_currency:
        current_user.preferred_currency = body.preferred_currency
    return current_user
