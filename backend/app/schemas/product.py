import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class ProductImageResponse(BaseModel):
    id: uuid.UUID
    url: str
    position: int
    alt_text: str | None

    model_config = {"from_attributes": True}


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    category: str = Field(pattern="^(clothes|bags|accessories)$")
    gender_target: str = Field(pattern="^(men|women|unisex)$")
    price_ngn: Decimal = Field(gt=0, decimal_places=2)
    sizes: list[str] | None = None
    is_in_stock: bool = True
    is_featured: bool = False


class CreateProductRequest(ProductBase):
    pass


class UpdateProductRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    category: str | None = Field(None, pattern="^(clothes|bags|accessories)$")
    gender_target: str | None = Field(None, pattern="^(men|women|unisex)$")
    price_ngn: Decimal | None = Field(None, gt=0)
    sizes: list[str] | None = None
    is_in_stock: bool | None = None
    is_featured: bool | None = None


class ProductSummary(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    gender_target: str
    price_ngn: Decimal
    sizes: list[str] | None
    is_in_stock: bool
    is_featured: bool
    images: list[ProductImageResponse]

    model_config = {"from_attributes": True}


class ProductDetailResponse(ProductSummary):
    description: str
    created_at: datetime
    updated_at: datetime
    outfit_tags: list["ProductSummary"] = []
    recommended: list["ProductSummary"] = []


class ProductListResponse(BaseModel):
    items: list[ProductSummary]
    total: int
    page: int
    page_size: int


class SetOutfitTagsRequest(BaseModel):
    product_ids: list[uuid.UUID] = Field(max_length=5)
