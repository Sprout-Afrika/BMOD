import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={"email": "test@bmod.store", "password": "securepass123"})
    assert resp.status_code == 201
    assert "Check your email" in resp.json()["message"]


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"email": "dup@bmod.store", "password": "securepass123"})
    resp = await client.post("/api/v1/auth/register", json={"email": "dup@bmod.store", "password": "securepass123"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_unverified(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"email": "unv@bmod.store", "password": "securepass123"})
    resp = await client.post("/api/v1/auth/login", json={"email": "unv@bmod.store", "password": "securepass123"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
