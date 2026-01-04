from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class TankCreate(BaseModel):
    """DTO for creating a Tank"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    capacity_liters: int
    shape: str = Field(..., min_length=1, max_length=30)
    height_cm: Optional[float] = None
    min_level_pct_alert: int
    critical_level_pct_alert: int
    sensor_level_id: Optional[UUID] = None
    sensor_pressure_id: Optional[UUID] = None
    metadata: Optional[dict] = None


class TankUpdate(BaseModel):
    """DTO for updating a Tank (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    capacity_liters: int
    shape: str = Field(..., min_length=1, max_length=30)
    height_cm: Optional[float] = None
    min_level_pct_alert: int
    critical_level_pct_alert: int
    sensor_level_id: Optional[UUID] = None
    sensor_pressure_id: Optional[UUID] = None
    metadata: Optional[dict] = None


class TankOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    name: str
    capacity_liters: int
    shape: str
    height_cm: Optional[float] = None
    min_level_pct_alert: int
    critical_level_pct_alert: int
    sensor_level_id: Optional[UUID] = None
    sensor_pressure_id: Optional[UUID] = None
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TankMinimalOut(BaseModel):
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


class TankPage(BaseModel):
    """Paginated response for Tanks"""
    items: list[TankOut]
    meta: PageMeta
