from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class IrrigationScheduleCreate(BaseModel):
    """DTO for creating a IrrigationSchedule"""
    tenant_id: UUID
    site_id: UUID
    zone_id: UUID
    cron: str = Field(..., min_length=1, max_length=120)
    duration_seconds: int
    is_enabled: bool
    metadata: Optional[dict] = None


class IrrigationScheduleUpdate(BaseModel):
    """DTO for updating a IrrigationSchedule (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    zone_id: UUID
    cron: str = Field(..., min_length=1, max_length=120)
    duration_seconds: int
    is_enabled: bool
    metadata: Optional[dict] = None


class IrrigationScheduleOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    zone_id: UUID
    cron: str
    duration_seconds: int
    is_enabled: bool
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IrrigationScheduleMinimalOut(BaseModel):
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


class IrrigationSchedulePage(BaseModel):
    """Paginated response for IrrigationSchedules"""
    items: list[IrrigationScheduleOut]
    meta: PageMeta
