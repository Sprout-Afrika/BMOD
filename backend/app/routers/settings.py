from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.settings import ExchangeRateResponse, SettingsListResponse, SettingResponse, UpdateSettingRequest
from app.services.settings_service import get_setting, get_all_settings, update_setting
from app.services.audit_service import log_action
from app.dependencies.auth import require_role
from app.models.user import User
from app.utils.image import upload_site_image

router = APIRouter(prefix="/settings", tags=["settings"])

_require_admin = Depends(require_role("ADMIN"))

PUBLIC_SETTING_KEYS = {
    "hero_banner_url",
    "hero_carousel_image_1_url",
    "hero_carousel_image_2_url",
    "hero_carousel_image_3_url",
    "category_clothes_image_url",
    "category_bags_image_url",
    "category_accessories_image_url",
    "footer_image_1_url",
    "footer_image_2_url",
    "footer_image_3_url",
}

SITE_IMAGE_KEYS = {
    "hero_banner_url": "hero-banner",
    "hero_carousel_image_1_url": "hero-carousel-1",
    "hero_carousel_image_2_url": "hero-carousel-2",
    "hero_carousel_image_3_url": "hero-carousel-3",
    "category_clothes_image_url": "category-clothes",
    "category_bags_image_url": "category-bags",
    "category_accessories_image_url": "category-accessories",
    "footer_image_1_url": "footer-image-1",
    "footer_image_2_url": "footer-image-2",
    "footer_image_3_url": "footer-image-3",
}

SITE_IMAGE_KEY_PATTERN = "^(" + "|".join(SITE_IMAGE_KEYS.keys()) + ")$"


@router.get("/exchange-rate", response_model=ExchangeRateResponse)
async def get_exchange_rate(db: AsyncSession = Depends(get_db)):
    value = await get_setting(db, "exchange_rate")
    return ExchangeRateResponse(exchange_rate=value)


@router.get("/public", response_model=SettingsListResponse)
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    settings = await get_all_settings(db)
    return SettingsListResponse(
        settings=[
            SettingResponse(key=s.key, value=s.value)
            for s in settings
            if s.key in PUBLIC_SETTING_KEYS
        ]
    )


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


@router.post("/images", response_model=SettingResponse, status_code=status.HTTP_201_CREATED)
async def upload_setting_image(
    key: str = Query(pattern=SITE_IMAGE_KEY_PATTERN),
    file: UploadFile = File(...),
    current_user: User = _require_admin,
    db: AsyncSession = Depends(get_db),
):
    url = await upload_site_image(file, SITE_IMAGE_KEYS[key])
    setting = await update_setting(db, key, url, current_user.id)
    await log_action(db, actor_id=current_user.id, action="settings.image.upload", target_type="settings", payload={"key": key})
    return SettingResponse(key=setting.key, value=setting.value)
