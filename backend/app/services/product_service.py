import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.product import Product, ProductImage, OutfitTag
from app.schemas.product import CreateProductRequest, UpdateProductRequest


async def list_products(
    db: AsyncSession,
    *,
    category: str | None = None,
    gender: str | None = None,
    size: str | None = None,
    in_stock: bool | None = None,
    price_min: Decimal | None = None,
    price_max: Decimal | None = None,
    featured: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Product], int]:
    query = select(Product).options(selectinload(Product.images))

    filters = []
    if category:
        filters.append(Product.category == category)
    if gender:
        filters.append(Product.gender_target == gender)
    if in_stock is not None:
        filters.append(Product.is_in_stock == in_stock)
    if price_min is not None:
        filters.append(Product.price_ngn >= price_min)
    if price_max is not None:
        filters.append(Product.price_ngn <= price_max)
    if featured is not None:
        filters.append(Product.is_featured == featured)
    if size:
        filters.append(Product.sizes.contains([size]))

    if filters:
        query = query.where(and_(*filters))

    count_q = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    query = query.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all(), total


async def search_products(db: AsyncSession, q: str, page: int = 1, page_size: int = 20) -> tuple[list[Product], int]:
    query = (
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.name.ilike(f"%{q}%"))
        .order_by(Product.created_at.desc())
    )
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    return result.scalars().all(), total


async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Product:
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.outfit_tags_source).selectinload(OutfitTag.target_product).selectinload(Product.images),
        )
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


async def get_recommended(db: AsyncSession, product: Product, limit: int = 4) -> list[Product]:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images))
        .where(
            Product.category == product.category,
            Product.gender_target == product.gender_target,
            Product.id != product.id,
        )
        .order_by(func.random())
        .limit(limit)
    )
    return result.scalars().all()


async def create_product(db: AsyncSession, data: CreateProductRequest, creator_id: uuid.UUID) -> Product:
    product = Product(**data.model_dump(), created_by=creator_id)
    db.add(product)
    await db.flush()
    return product


async def update_product(db: AsyncSession, product_id: uuid.UUID, data: UpdateProductRequest) -> Product:
    product = await get_product(db, product_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    return product


async def delete_product(db: AsyncSession, product_id: uuid.UUID) -> None:
    product = await get_product(db, product_id)
    await db.delete(product)


async def set_outfit_tags(db: AsyncSession, product_id: uuid.UUID, target_ids: list[uuid.UUID]) -> None:
    await db.execute(
        OutfitTag.__table__.delete().where(OutfitTag.source_product_id == product_id)
    )
    for tid in set(target_ids):
        if tid == product_id:
            continue
        db.add(OutfitTag(source_product_id=product_id, target_product_id=tid))
