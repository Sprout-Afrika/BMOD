import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.database import Base, get_db
from app.utils.redis_client import close_redis

TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://bmod:bmod_dev_password@localhost:5432/bmod_test")

engine = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db():
    async with TestSession() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def clean_db():
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(text(f'TRUNCATE TABLE "{table.name}" RESTART IDENTITY CASCADE'))
    yield


@pytest_asyncio.fixture
async def client(clean_db, monkeypatch):
    async def noop_send_email(*args, **kwargs):
        return None

    monkeypatch.setattr("app.routers.auth.send_verification_email", noop_send_email)
    monkeypatch.setattr("app.routers.auth.send_otp_email", noop_send_email)

    async def override_get_db():
        async with TestSession() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    await close_redis()
    app.dependency_overrides.clear()
