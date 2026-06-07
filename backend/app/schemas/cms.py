import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class AuditLogEntry(BaseModel):
    id: uuid.UUID
    actor_id: uuid.UUID | None
    action: str
    target_type: str | None
    target_id: uuid.UUID | None
    payload: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    items: list[AuditLogEntry]
    total: int
    page: int
    page_size: int


class StaffUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateStaffRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
