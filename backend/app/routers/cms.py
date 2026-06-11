import uuid
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.database import get_db
from app.schemas.cms import AuditLogResponse, AuditLogEntry, StaffUserResponse, CreateStaffRequest
from app.models.audit import AuditLog
from app.models.user import User
from app.services.auth_service import hash_password
from app.services.audit_service import log_action
from app.dependencies.auth import require_role
from app.utils.image import check_image_storage
from app.utils.redis_client import get_redis

router = APIRouter(prefix="/cms", tags=["cms"])

_require_admin = Depends(require_role("ADMIN"))


async def _check_database(db: AsyncSession) -> tuple[str, str | None]:
    try:
        await db.execute(text("SELECT 1"))
        return "ok", None
    except Exception:
        return "error", "Database connection failed"


async def _check_redis() -> tuple[str, str | None]:
    try:
        redis = await get_redis()
        await redis.ping()
        return "ok", None
    except Exception:
        return "error", "Redis connection failed"


async def _check_storage() -> tuple[str, str | None]:
    try:
        if await check_image_storage():
            return "ok", None
        return "not_configured", "R2 storage settings are incomplete"
    except Exception:
        return "error", "R2 storage connection failed"


@router.get("/integrations/status")
async def get_integration_status(
    current_user: User = _require_admin,
    db: AsyncSession = Depends(get_db),
):
    database_status, database_message = await _check_database(db)
    redis_status, redis_message = await _check_redis()
    storage_status, storage_message = await _check_storage()

    return {
        "services": {
            "database": {"status": database_status, "message": database_message},
            "redis": {"status": redis_status, "message": redis_message},
            "storage": {"status": storage_status, "message": storage_message},
        }
    }


@router.get("/audit-log", response_model=AuditLogResponse)
async def get_audit_log(
    actor_id: uuid.UUID | None = None,
    action: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = _require_admin,
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)
    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    items = result.scalars().all()

    return AuditLogResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/staff", response_model=list[StaffUserResponse])
async def list_staff(
    current_user: User = _require_admin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.role.in_(["STAFF", "ADMIN"]), User.deleted_at.is_(None))
    )
    return result.scalars().all()


@router.post("/staff", response_model=StaffUserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    body: CreateStaffRequest,
    current_user: User = _require_admin,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select as sel
    existing = await db.execute(sel(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    staff = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        role="STAFF",
        is_verified=True,
    )
    db.add(staff)
    await db.flush()
    await log_action(db, actor_id=current_user.id, action="staff.create", target_type="user", target_id=staff.id)
    return staff


@router.delete("/staff/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_staff(
    staff_id: uuid.UUID,
    current_user: User = _require_admin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == staff_id))
    user = result.scalar_one_or_none()
    if not user or user.role not in ("STAFF",):
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found")
    user.role = "USER"
    await log_action(db, actor_id=current_user.id, action="staff.revoke", target_type="user", target_id=staff_id)
