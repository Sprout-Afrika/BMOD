import uuid
from datetime import datetime
from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    ref_number: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum(
            "PENDING_WHATSAPP",
            "AWAITING_PAYMENT",
            "PAID",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "COMPLETED",
            "EXPIRED",
            "CANCELLED",
            name="order_status",
        ),
        default="PENDING_WHATSAPP",
        nullable=False,
    )
    cart_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    customer_info: Mapped[dict] = mapped_column(JSONB, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(32), nullable=False)
    total_ngn: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    whatsapp_message: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
