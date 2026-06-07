from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import get_settings
from app.middleware.security import SecurityHeadersMiddleware
from app.routers import auth, products, cart, wishlist, settings, cms
from app.utils.redis_client import close_redis
from app.database import engine, Base
import app.models  # noqa: F401 — ensure all models are registered before create_all

settings_cfg = get_settings()

limiter = Limiter(key_func=get_remote_address)


def _allowed_origins() -> list[str]:
    return [origin.strip() for origin in settings_cfg.frontend_origin.split(",") if origin.strip()]


def _validate_production_settings() -> None:
    if settings_cfg.environment != "production":
        return

    if settings_cfg.jwt_secret_key in {"insecure-dev-secret-change-me", "change-me-to-a-256-bit-random-string"}:
        raise RuntimeError("JWT_SECRET_KEY must be set to a strong production secret")
    if not settings_cfg.frontend_origin.startswith("https://"):
        raise RuntimeError("FRONTEND_ORIGIN must be an https:// origin in production")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _validate_production_settings()
    if settings_cfg.environment != "production":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await close_redis()


app = FastAPI(
    title="BMOD API",
    version="1.0.0",
    docs_url="/api/docs" if settings_cfg.environment != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(cart.router, prefix="/api/v1")
app.include_router(wishlist.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")
app.include_router(cms.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "BMOD API"}


@app.get("/ready")
async def ready():
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return {"status": "ready"}
