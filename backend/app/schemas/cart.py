import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field
from app.schemas.product import ProductSummary


class AddCartItemRequest(BaseModel):
    product_id: uuid.UUID
    size: str | None = Field(None, max_length=10)
    quantity: int = Field(default=1, ge=1, le=100)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(ge=1, le=100)


class CheckoutRequest(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=r"^\+?[1-9]\d{7,14}$")
    delivery_address: str = Field(min_length=5, max_length=500)
    payment_method: str = Field(pattern="^(Bank Transfer|Cash|POS)$")
    whatsapp_opt_in: Literal[True]


class CartItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product: ProductSummary
    size: str | None
    quantity: int
    line_total_ngn: Decimal

    model_config = {"from_attributes": True}


class CartResponse(BaseModel):
    items: list[CartItemResponse]
    total_ngn: Decimal
    total_usd: Decimal | None
    item_count: int


class CheckoutResponse(BaseModel):
    url: str
    order_summary: str
    order_ref: str
    expires_at: datetime
