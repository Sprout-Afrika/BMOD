import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.settings import Setting


async def get_setting(db: AsyncSession, key: str) -> str:
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Setting '{key}' not found")
    return setting.value


async def get_all_settings(db: AsyncSession) -> list[Setting]:
    result = await db.execute(select(Setting).order_by(Setting.key))
    return result.scalars().all()


async def update_setting(db: AsyncSession, key: str, value: str, actor_id: uuid.UUID) -> Setting:
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        setting = Setting(key=key, value=value, updated_by=actor_id)
        db.add(setting)
    else:
        setting.value = value
        setting.updated_by = actor_id
    return setting
