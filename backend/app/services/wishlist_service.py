import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.wishlist import WishlistItem
from app.models.product import Product


async def get_wishlist(db: AsyncSession, user_id: uuid.UUID) -> list[WishlistItem]:
    result = await db.execute(
        select(WishlistItem)
        .options(selectinload(WishlistItem.product).selectinload(Product.images))
        .where(WishlistItem.user_id == user_id)
        .order_by(WishlistItem.added_at.desc())
    )
    return result.scalars().all()


async def add_to_wishlist(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID) -> WishlistItem:
    prod = await db.execute(select(Product).where(Product.id == product_id))
    if not prod.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing = await db.execute(
        select(WishlistItem).where(WishlistItem.user_id == user_id, WishlistItem.product_id == product_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already in wishlist")

    item = WishlistItem(user_id=user_id, product_id=product_id)
    db.add(item)
    await db.flush()
    return item


async def remove_from_wishlist(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID) -> None:
    result = await db.execute(
        select(WishlistItem).where(WishlistItem.user_id == user_id, WishlistItem.product_id == product_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not in wishlist")
    await db.delete(item)
