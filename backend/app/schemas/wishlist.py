import uuid
from datetime import datetime
from pydantic import BaseModel
from app.schemas.product import ProductSummary


class AddWishlistRequest(BaseModel):
    product_id: uuid.UUID


class WishlistItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product: ProductSummary
    added_at: datetime

    model_config = {"from_attributes": True}


class WishlistResponse(BaseModel):
    items: list[WishlistItemResponse]
    total: int
