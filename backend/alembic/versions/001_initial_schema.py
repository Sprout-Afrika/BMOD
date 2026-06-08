"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None

user_role = postgresql.ENUM("USER", "STAFF", "ADMIN", name="user_role", create_type=False)
currency_type = postgresql.ENUM("NGN", "USD", name="currency_type", create_type=False)
product_category = postgresql.ENUM("clothes", "bags", "accessories", name="product_category", create_type=False)
gender_target = postgresql.ENUM("men", "women", "unisex", name="gender_target", create_type=False)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE user_role AS ENUM ('USER', 'STAFF', 'ADMIN');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE currency_type AS ENUM ('NGN', 'USD');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE product_category AS ENUM ('clothes', 'bags', 'accessories');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE gender_target AS ENUM ('men', 'women', 'unisex');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="USER"),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("preferred_currency", currency_type, nullable=False, server_default="NGN"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("category", product_category, nullable=False),
        sa.Column("gender_target", gender_target, nullable=False),
        sa.Column("price_ngn", sa.Numeric(12, 2), nullable=False),
        sa.Column("sizes", postgresql.ARRAY(sa.String(10)), nullable=True),
        sa.Column("is_in_stock", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_featured", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "product_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("position", sa.SmallInteger, nullable=False),
        sa.Column("alt_text", sa.String(255), nullable=True),
        sa.CheckConstraint("position IN (1, 2, 3)", name="position_check"),
    )

    op.create_table(
        "outfit_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("source_product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("source_product_id", "target_product_id", name="uq_outfit_tag"),
    )

    op.create_table(
        "cart_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("size", sa.String(10), nullable=True),
        sa.Column("quantity", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("user_id", "product_id", "size", name="uq_cart_item"),
        sa.CheckConstraint("quantity > 0", name="quantity_positive"),
    )

    op.create_table(
        "wishlist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("user_id", "product_id", name="uq_wishlist_item"),
    )

    op.create_table(
        "settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.Text, nullable=False),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.execute(
        """
        INSERT INTO settings (key, value)
        VALUES ('exchange_rate', '1600'), ('whatsapp_number', '2348012345678')
        ON CONFLICT (key) DO NOTHING
        """
    )

    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=True),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_audit_log_actor", "audit_log", ["actor_id"])
    op.create_index("ix_audit_log_created", "audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("settings")
    op.drop_table("wishlist_items")
    op.drop_table("cart_items")
    op.drop_table("outfit_tags")
    op.drop_table("product_images")
    op.drop_table("products")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS gender_target")
    op.execute("DROP TYPE IF EXISTS product_category")
    op.execute("DROP TYPE IF EXISTS currency_type")
    op.execute("DROP TYPE IF EXISTS user_role")
