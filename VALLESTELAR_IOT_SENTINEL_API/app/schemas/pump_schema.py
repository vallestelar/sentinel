from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class PumpCreate(BaseModel):
    """DTO for creating a Pump"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    actuator_id: Optional[UUID] = None
    mode: str = Field(..., min_length=1, max_length=20)
    metadata: Optional[dict] = None


class PumpUpdate(BaseModel):
    """DTO for updating a Pump (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    actuator_id: Optional[UUID] = None
    mode: str = Field(..., min_length=1, max_length=20)
    metadata: Optional[dict] = None


class PumpOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    name: str
    actuator_id: Optional[UUID] = None
    mode: str
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PumpMinimalOut(BaseModel):
    """Minimal DTO for output (what is returned in the API)"""
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class PageMeta(BaseModel):
    """Metadata for pagination"""
    total: int
    page: int
    page_size: int
    pages: int


class PumpPage(BaseModel):
    """Paginated response for Pumps"""
    items: list[PumpOut]
    meta: PageMeta
