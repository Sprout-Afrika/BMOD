from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://bmod:password@localhost:5432/bmod_db"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if not isinstance(value, str):
            return value

        if value.startswith("postgres://"):
            value = value.replace("postgres://", "postgresql+asyncpg://", 1)
        elif value.startswith("postgresql://"):
            value = value.replace("postgresql://", "postgresql+asyncpg://", 1)

        parts = urlsplit(value)
        if parts.query:
            query = urlencode([(key, val) for key, val in parse_qsl(parts.query) if key != "sslmode"])
            value = urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))

        return value

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "insecure-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Email
    smtp_host: str = "smtp.resend.com"
    smtp_port: int = 587
    smtp_username: str = "resend"
    smtp_password: str = ""
    email_from: str = "no-reply@bmod.store"

    # R2 / S3
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "bmod-images"
    r2_public_url: str = "https://images.bmod.store"
    r2_endpoint_url: str = ""

    # WhatsApp checkout
    whatsapp_number: str = ""

    # App
    environment: str = "development"
    frontend_origin: str = "http://localhost:4200"


@lru_cache
def get_settings() -> Settings:
    return Settings()
