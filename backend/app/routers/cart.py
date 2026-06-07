import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.cart import (
    AddCartItemRequest, UpdateCartItemRequest,
    CartResponse, CartItemResponse, CheckoutRequest, CheckoutResponse,
)
from app.services import cart_service
from app.services.order_service import create_pending_whatsapp_order
from app.services.settings_service import get_setting
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.utils.whatsapp import build_whatsapp_url

router = APIRouter(prefix="/cart", tags=["cart"])
limiter = Limiter(key_func=get_remote_address)


def _build_cart_response(items, exchange_rate: Decimal | None, currency: str) -> CartResponse:
    total_ngn = sum(Decimal(str(i.product.price_ngn)) * i.quantity for i in items)
    total_usd = (total_ngn / exchange_rate) if exchange_rate and currency == "USD" else None

    item_responses = [
        CartItemResponse(
            id=i.id,
            product_id=i.product_id,
            product=i.product,
            size=i.size,
            quantity=i.quantity,
            line_total_ngn=Decimal(str(i.product.price_ngn)) * i.quantity,
        )
        for i in items
    ]
    return CartResponse(
        items=item_responses,
        total_ngn=total_ngn,
        total_usd=total_usd,
        item_count=sum(i.quantity for i in items),
    )


@router.get("/", response_model=CartResponse)
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await cart_service.get_cart(db, current_user.id)
    try:
        rate = Decimal(await get_setting(db, "exchange_rate"))
    except Exception:
        rate = None
    return _build_cart_response(items, rate, current_user.preferred_currency)


@router.post("/items", status_code=status.HTTP_201_CREATED)
async def add_item(
    body: AddCartItemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await cart_service.add_item(db, current_user.id, body.product_id, body.size, body.quantity)
    return {"message": "Item added to cart"}


@router.patch("/items/{item_id}")
async def update_item(
    item_id: uuid.UUID,
    body: UpdateCartItemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await cart_service.update_item(db, current_user.id, item_id, body.quantity)
    return {"message": "Cart updated"}


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await cart_service.remove_item(db, current_user.id, item_id)


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await cart_service.clear_cart(db, current_user.id)


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("5/minute")
async def checkout(
    body: CheckoutRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await cart_service.get_cart(db, current_user.id)
    if not items:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    whatsapp_number = await get_setting(db, "whatsapp_number")

    order = await create_pending_whatsapp_order(db, current_user, items, body)
    url = build_whatsapp_url(order.whatsapp_message, whatsapp_number)
    return CheckoutResponse(
        url=url,
        order_summary=order.whatsapp_message,
        order_ref=order.ref_number,
        expires_at=order.expires_at,
    )
