from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class SensorReadingCreate(BaseModel):
    """DTO for creating a SensorReading"""
    tenant_id: UUID
    site_id: UUID
    sensor_id: UUID
    ts: datetime
    value: float
    quality: str = Field(..., min_length=1, max_length=20)
    meta: Optional[dict] = None


class SensorReadingUpdate(BaseModel):
    """DTO for updating a SensorReading (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    sensor_id: UUID
    ts: datetime
    value: float
    quality: str = Field(..., min_length=1, max_length=20)
    meta: Optional[dict] = None


class SensorReadingOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    sensor_id: UUID
    ts: datetime
    value: float
    quality: str
    meta: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SensorReadingMinimalOut(BaseModel):
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


class SensorReadingPage(BaseModel):
    """Paginated response for SensorReading5ms"""
    items: list[SensorReadingOut]
    meta: PageMeta
