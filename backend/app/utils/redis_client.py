from redis.asyncio import Redis
from app.config import get_settings

_redis: Redis | None = None


async def get_redis() -> Redis:
    global _redis
    if _redis is None:
        settings = get_settings()
        # Upstash uses rediss:// (TLS). ssl_cert_reqs=None skips hostname verification
        # which Upstash requires because their cert CN doesn't always match the endpoint.
        extra = {"ssl_cert_reqs": None} if settings.redis_url.startswith("rediss://") else {}
        _redis = Redis.from_url(settings.redis_url, decode_responses=True, **extra)
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
