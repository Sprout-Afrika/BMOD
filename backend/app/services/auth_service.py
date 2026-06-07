import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.config import get_settings
from app.models.user import User
from app.utils.redis_client import get_redis

settings = get_settings()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

VERIFY_TOKEN_TTL = 86400      # 24 h
OTP_TTL = 600                 # 10 min
LOCK_TTL = 900                # 15 min
MAX_FAILED_LOGINS = 5


def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _ua_fingerprint(user_agent: str) -> str:
    """SHA-256 of user-agent — deterministic across processes, unlike hash()."""
    return hashlib.sha256(user_agent.encode("utf-8", errors="replace")).hexdigest()[:24]


def _hash_token(token: str) -> str:
    """SHA-256 of refresh token stored in Redis so plaintext never persists."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_refresh_token() -> str:
    return secrets.token_urlsafe(64)


async def register_user(db: AsyncSession, email: str, password: str) -> tuple[User, str]:
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=email, hashed_password=hash_password(password))
    db.add(user)
    await db.flush()

    redis = await get_redis()
    verify_token = secrets.token_urlsafe(32)
    await redis.setex(f"verify:{verify_token}", VERIFY_TOKEN_TTL, str(user.id))
    return user, verify_token


async def verify_email(db: AsyncSession, token: str) -> User:
    redis = await get_redis()
    user_id = await redis.get(f"verify:{token}")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_verified = True
    await redis.delete(f"verify:{token}")
    return user


async def login_user(db: AsyncSession, email: str, password: str, user_agent: str) -> tuple[str, str]:
    result = await db.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    redis = await get_redis()

    if user:
        lock_key = f"login_locked:{user.id}"
        if await redis.get(lock_key):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Account temporarily locked")

    # Always run bcrypt to prevent timing-based username enumeration
    _dummy = "$2b$12$invalidhashfortimingprotectionxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    password_ok = verify_password(password, user.hashed_password if user else _dummy)

    if not user or not password_ok:
        if user:
            fail_key = f"login_fail:{user.id}"
            fails = await redis.incr(fail_key)
            await redis.expire(fail_key, LOCK_TTL)
            if fails >= MAX_FAILED_LOGINS:
                await redis.setex(f"login_locked:{user.id}", LOCK_TTL, "1")
                await redis.delete(fail_key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")

    await redis.delete(f"login_fail:{user.id}")

    access_token = create_access_token(user)
    refresh_token = create_refresh_token()

    rt_key = f"refresh:{user.id}:{_ua_fingerprint(user_agent)}"
    # Store hash of the token — plaintext never persists in Redis
    await redis.setex(rt_key, settings.refresh_token_expire_days * 86400, _hash_token(refresh_token))

    return access_token, refresh_token, str(user.id)


async def refresh_access_token(db: AsyncSession, refresh_token: str, user_id: str, user_agent: str) -> tuple[str, str]:
    redis = await get_redis()
    rt_key = f"refresh:{user_id}:{_ua_fingerprint(user_agent)}"
    stored = await redis.get(rt_key)

    if not stored or not secrets.compare_digest(stored, _hash_token(refresh_token)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id), User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_access = create_access_token(user)
    new_refresh = create_refresh_token()
    await redis.delete(rt_key)
    await redis.setex(rt_key, settings.refresh_token_expire_days * 86400, _hash_token(new_refresh))

    return new_access, new_refresh


async def logout_user(user_id: str, user_agent: str) -> None:
    redis = await get_redis()
    rt_key = f"refresh:{user_id}:{_ua_fingerprint(user_agent)}"
    await redis.delete(rt_key)


async def send_password_reset_otp(db: AsyncSession, email: str) -> str | None:
    result = await db.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        return None

    otp = str(secrets.randbelow(900000) + 100000)
    redis = await get_redis()
    await redis.setex(f"otp:{email}", OTP_TTL, otp)
    return otp


async def reset_password(db: AsyncSession, email: str, otp: str, new_password: str) -> None:
    redis = await get_redis()
    stored_otp = await redis.get(f"otp:{email}")
    if not stored_otp or not secrets.compare_digest(stored_otp, otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    result = await db.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(new_password)
    await redis.delete(f"otp:{email}")
