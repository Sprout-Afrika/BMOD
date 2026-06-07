from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.settings import ExchangeRateResponse, SettingsListResponse, SettingResponse, UpdateSettingRequest
from app.services.settings_service import get_setting, get_all_settings, update_setting
from app.services.audit_service import log_action
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["settings"])

_require_admin = Depends(require_role("ADMIN"))


@router.get("/exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate(db: AsyncSession = Depends(get_db)):
    value = await get_setting(db, "exchange_rate")
    return ExchangeRateResponse(exchange_rate=value)


@router.get("/", response_model=SettingsListResponse)
async def list_settings(
    current_user: User = _require_admin,
    db: AsyncSession = Depends(get_db),
):
    settings = await get_all_settings(db)
    return SettingsListResponse(settings=[SettingResponse(key=s.key, value=s.value) for s in settings])


@router.patch("/{key}", response_model=SettingResponse)
async def update_setting_key(
    key: str,
    body: UpdateSettingRequest,
    current_user: User = _require_admin,
    db: AsyncSession = Depends(get_db),
):
    setting = await update_setting(db, key, body.value, current_user.id)
    await log_action(db, actor_id=current_user.id, action="settings.update", target_type="settings", payload={"key": key, "value": body.value})
    return SettingResponse(key=setting.key, value=setting.value)
