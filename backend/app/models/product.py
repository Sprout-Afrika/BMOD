import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Numeric, SmallInteger, Enum as SAEnum, DateTime, ForeignKey, UniqueConstraint, func, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        SAEnum("clothes", "bags", "accessories", name="product_category"), nullable=False
    )
    gender_target: Mapped[str] = mapped_column(
        SAEnum("men", "women", "unisex", name="gender_target"), nullable=False
    )
    price_ngn: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    sizes: Mapped[list[str] | None] = mapped_column(ARRAY(String(10)), nullable=True)
    is_in_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.position"
    )
    outfit_tags_source: Mapped[list["OutfitTag"]] = relationship(
        "OutfitTag", foreign_keys="OutfitTag.source_product_id",
        back_populates="source_product", cascade="all, delete-orphan"
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)

    product: Mapped["Product"] = relationship("Product", back_populates="images")

    __table_args__ = (
        CheckConstraint("position IN (1, 2, 3)", name="position_check"),
    )


class OutfitTag(Base):
    __tablename__ = "outfit_tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    target_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )

    source_product: Mapped["Product"] = relationship("Product", foreign_keys=[source_product_id])
    target_product: Mapped["Product"] = relationship("Product", foreign_keys=[target_product_id])

    __table_args__ = (
        UniqueConstraint("source_product_id", "target_product_id", name="uq_outfit_tag"),
    )
