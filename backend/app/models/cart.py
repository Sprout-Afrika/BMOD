import uuid
from datetime import datetime
from sqlalchemy import String, SmallInteger, ForeignKey, UniqueConstraint, DateTime, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    size: Mapped[str | None] = mapped_column(String(10), nullable=True)
    quantity: Mapped[int] = mapped_column(SmallInteger, default=1, nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    product: Mapped["Product"] = relationship("Product", lazy="selectin")  # type: ignore[name-defined]

    __table_args__ = (
        UniqueConstraint("user_id", "product_id", "size", name="uq_cart_item"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
    )
