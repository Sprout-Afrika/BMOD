import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.cart import CartItem
from app.models.product import Product


async def get_cart(db: AsyncSession, user_id: uuid.UUID) -> list[CartItem]:
    result = await db.execute(
        select(CartItem)
        .options(selectinload(CartItem.product).selectinload(Product.images))
        .where(CartItem.user_id == user_id)
        .order_by(CartItem.added_at)
    )
    return result.scalars().all()


async def add_item(db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID, size: str | None, quantity: int) -> CartItem:
    prod_result = await db.execute(select(Product).where(Product.id == product_id))
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if not product.is_in_stock:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product is out of stock")

    existing = await db.execute(
        select(CartItem).where(CartItem.user_id == user_id, CartItem.product_id == product_id, CartItem.size == size)
    )
    item = existing.scalar_one_or_none()
    if item:
        item.quantity = min(item.quantity + quantity, 100)
        return item

    item = CartItem(user_id=user_id, product_id=product_id, size=size, quantity=quantity)
    db.add(item)
    await db.flush()
    return item


async def update_item(db: AsyncSession, user_id: uuid.UUID, item_id: uuid.UUID, quantity: int) -> CartItem:
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    item.quantity = quantity
    return item


async def remove_item(db: AsyncSession, user_id: uuid.UUID, item_id: uuid.UUID) -> None:
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    await db.delete(item)


async def clear_cart(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(delete(CartItem).where(CartItem.user_id == user_id))
