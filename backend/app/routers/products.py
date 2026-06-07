import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, UploadFile, File, status, Query, Request, Path
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.product import (
    CreateProductRequest, UpdateProductRequest, ProductDetailResponse,
    ProductListResponse, ProductSummary, SetOutfitTagsRequest,
)
from app.services import product_service
from app.services.audit_service import log_action
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.models.product import ProductImage, Product
from app.utils.image import upload_product_image, delete_product_image
from sqlalchemy import select, delete

router = APIRouter(prefix="/products", tags=["products"])
limiter = Limiter(key_func=get_remote_address)

_require_staff = Depends(require_role("STAFF", "ADMIN"))
_require_admin = Depends(require_role("ADMIN"))


@router.get("/", response_model=ProductListResponse)
async def list_products(
    category: str | None = Query(None, pattern="^(clothes|bags|accessories)$"),
    gender: str | None = Query(None, pattern="^(men|women|unisex)$"),
    size: str | None = Query(None, max_length=10),
    in_stock: bool | None = None,
    price_min: Decimal | None = Query(None, ge=0),
    price_max: Decimal | None = Query(None, ge=0),
    featured: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await product_service.list_products(
        db, category=category, gender=gender, size=size,
        in_stock=in_stock, price_min=price_min, price_max=price_max,
        featured=featured, page=page, page_size=page_size,
    )
    return ProductListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/search", response_model=ProductListResponse)
@limiter.limit("10/minute")
async def search_products(
    request: Request,
    q: str = Query(min_length=3, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await product_service.search_products(db, q, page, page_size)
    return ProductListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    product = await product_service.get_product(db, product_id)
    recommended = await product_service.get_recommended(db, product)

    outfit_tags = [tag.target_product for tag in product.outfit_tags_source]
    return ProductDetailResponse(
        **ProductSummary.model_validate(product).model_dump(),
        description=product.description,
        created_at=product.created_at,
        updated_at=product.updated_at,
        outfit_tags=outfit_tags,
        recommended=recommended,
    )


@router.post("/", response_model=ProductSummary, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: CreateProductRequest,
    current_user: User = _require_staff,
    db: AsyncSession = Depends(get_db),
):
    product = await product_service.create_product(db, body, current_user.id)
    await log_action(db, actor_id=current_user.id, action="product.create", target_type="product", target_id=product.id, payload=body.model_dump(mode="json"))
    return product


@router.patch("/{product_id}", response_model=ProductSummary)
async def update_product(
    product_id: uuid.UUID,
    body: UpdateProductRequest,
    current_user: User = _require_staff,
    db: AsyncSession = Depends(get_db),
):
    product = await product_service.update_product(db, product_id, body)
    await log_action(db, actor_id=current_user.id, action="product.update", target_type="product", target_id=product_id, payload=body.model_dump(exclude_unset=True, mode="json"))
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    current_user: User = _require_admin,
    db: AsyncSession = Depends(get_db),
):
    await product_service.delete_product(db, product_id)
    await log_action(db, actor_id=current_user.id, action="product.delete", target_type="product", target_id=product_id)


@router.post("/{product_id}/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
    product_id: uuid.UUID,
    position: int = Query(ge=1, le=3),
    alt_text: str | None = None,
    file: UploadFile = File(...),
    current_user: User = _require_staff,
    db: AsyncSession = Depends(get_db),
):
    await product_service.get_product(db, product_id)
    url = await upload_product_image(file, product_id, position)

    await db.execute(
        ProductImage.__table__.delete().where(
            ProductImage.product_id == product_id,
            ProductImage.position == position,
        )
    )
    img = ProductImage(product_id=product_id, url=url, position=position, alt_text=alt_text)
    db.add(img)
    await log_action(db, actor_id=current_user.id, action="product.image.upload", target_type="product", target_id=product_id)
    return {"url": url, "position": position}


@router.delete("/{product_id}/images/{position}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    product_id: uuid.UUID,
    position: int = Path(ge=1, le=3),
    current_user: User = _require_staff,
    db: AsyncSession = Depends(get_db),
):
    await delete_product_image(product_id, position)
    await db.execute(
        ProductImage.__table__.delete().where(
            ProductImage.product_id == product_id,
            ProductImage.position == position,
        )
    )
    await log_action(db, actor_id=current_user.id, action="product.image.delete", target_type="product", target_id=product_id)


@router.post("/{product_id}/outfit-tags", status_code=status.HTTP_200_OK)
async def set_outfit_tags(
    product_id: uuid.UUID,
    body: SetOutfitTagsRequest,
    current_user: User = _require_staff,
    db: AsyncSession = Depends(get_db),
):
    await product_service.set_outfit_tags(db, product_id, body.product_ids)
    await log_action(db, actor_id=current_user.id, action="product.outfit_tags.set", target_type="product", target_id=product_id)
    return {"message": "Outfit tags updated"}
