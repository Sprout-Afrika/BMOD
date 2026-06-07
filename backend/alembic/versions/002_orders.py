"""Add WhatsApp pending orders

Revision ID: 002
Revises: 001
Create Date: 2026-06-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE order_status AS ENUM ("
        "'PENDING_WHATSAPP', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', "
        "'SHIPPED', 'DELIVERED', 'COMPLETED', 'EXPIRED', 'CANCELLED')"
    )
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ref_number", sa.String(24), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
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
                create_type=False,
            ),
            nullable=False,
            server_default="PENDING_WHATSAPP",
        ),
        sa.Column("cart_snapshot", postgresql.JSONB, nullable=False),
        sa.Column("customer_info", postgresql.JSONB, nullable=False),
        sa.Column("payment_method", sa.String(32), nullable=False),
        sa.Column("total_ngn", sa.Numeric(12, 2), nullable=False),
        sa.Column("whatsapp_message", sa.Text, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_orders_ref_number", "orders", ["ref_number"], unique=True)
    op.create_index("ix_orders_user_status", "orders", ["user_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_orders_user_status", table_name="orders")
    op.drop_index("ix_orders_ref_number", table_name="orders")
    op.drop_table("orders")
    op.execute("DROP TYPE IF EXISTS order_status")
