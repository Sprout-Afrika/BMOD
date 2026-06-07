import random
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.cart import CartItem
from app.models.order import Order
from app.models.user import User
from app.schemas.cart import CheckoutRequest
from app.utils.whatsapp import build_order_message


async def create_pending_whatsapp_order(
    db: AsyncSession,
    user: User,
    items: list[CartItem],
    body: CheckoutRequest,
) -> Order:
    ref_number = await _generate_order_ref(db)
    expires_at = datetime.now(UTC) + timedelta(hours=24)
    snapshot, total_ngn = _build_cart_snapshot(items)
    customer_info = {
        "name": body.customer_name,
        "phone": body.phone,
        "address": body.delivery_address,
        "email": user.email,
    }
    message = build_order_message(
        ref_number=ref_number,
        cart_snapshot=snapshot,
        customer_info=customer_info,
        payment_method=body.payment_method,
        total_ngn=total_ngn,
        expires_at=expires_at,
    )

    order = Order(
        user_id=user.id,
        ref_number=ref_number,
        status="PENDING_WHATSAPP",
        cart_snapshot=snapshot,
        customer_info=customer_info,
        payment_method=body.payment_method,
        total_ngn=total_ngn,
        whatsapp_message=message,
        expires_at=expires_at,
    )
    db.add(order)
    await db.flush()
    return order


async def _generate_order_ref(db: AsyncSession) -> str:
    today = datetime.now(UTC).strftime("%Y%m%d")
    for _ in range(10):
        candidate = f"ORD-{today}-{random.randint(1000, 9999)}"
        result = await db.execute(select(Order.id).where(Order.ref_number == candidate))
        if result.scalar_one_or_none() is None:
            return candidate
    return f"ORD-{today}-{uuid.uuid4().hex[:8].upper()}"


def _build_cart_snapshot(items: list[CartItem]) -> tuple[dict, Decimal]:
    snapshot_items = []
    total_ngn = Decimal("0")

    for item in items:
        product = item.product
        unit_price = Decimal(str(product.price_ngn))
        line_total = unit_price * item.quantity
        total_ngn += line_total
        snapshot_items.append(
            {
                "product_id": str(item.product_id),
                "name": product.name,
                "size": item.size,
                "quantity": item.quantity,
                "unit_price_ngn": str(unit_price),
                "line_total_ngn": str(line_total),
            }
        )

    return {"items": snapshot_items}, total_ngn
