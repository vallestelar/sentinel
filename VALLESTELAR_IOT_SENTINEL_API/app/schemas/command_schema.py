from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class CommandCreate(BaseModel):
    """DTO for creating a Command"""
    tenant_id: UUID
    site_id: UUID
    actuator_id: UUID
    command_type: str = Field(..., min_length=1, max_length=30)
    payload: Optional[dict] = None
    status: str = Field(..., min_length=1, max_length=30)
    requested_by_id: Optional[UUID] = None
    sent_at: Optional[datetime] = None
    acked_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class CommandUpdate(BaseModel):
    """DTO for updating a Command (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    actuator_id: UUID
    command_type: str = Field(..., min_length=1, max_length=30)
    payload: Optional[dict] = None
    status: str = Field(..., min_length=1, max_length=30)
    requested_by_id: Optional[UUID] = None
    sent_at: Optional[datetime] = None
    acked_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class CommandOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    actuator_id: UUID
    command_type: str
    payload: Optional[dict] = None
    status: str
    requested_by_id: Optional[UUID] = None
    sent_at: Optional[datetime] = None
    acked_at: Optional[datetime] = None
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CommandMinimalOut(BaseModel):
    """Minimal DTO for output (what is returned in the API)"""
    id: UUID
    id: UUID

    model_config = ConfigDict(from_attributes=True)


class PageMeta(BaseModel):
    """Metadata for pagination"""
    total: int
    page: int
    page_size: int
    pages: int


class CommandPage(BaseModel):
    """Paginated response for Commands"""
    items: list[CommandOut]
    meta: PageMeta
