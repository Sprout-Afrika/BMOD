import uuid
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.schemas.cms import AuditLogResponse, AuditLogEntry, StaffUserResponse, CreateStaffRequest
from app.models.audit import AuditLog
from app.models.user import User
from app.services.auth_service import hash_password
from app.services.audit_service import log_action
from app.dependencies.auth import require_role

router = APIRouter(prefix="/cms", tags=["cms"])

_require_admin = Depends(require_role("ADMIN"))


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
