from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class IrrigationZoneCreate(BaseModel):
    """DTO for creating a IrrigationZone"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    actuator_id: Optional[UUID] = None
    sensor_moisture_id: Optional[UUID] = None
    sensor_flow_id: Optional[UUID] = None
    metadata: Optional[dict] = None


class IrrigationZoneUpdate(BaseModel):
    """DTO for updating a IrrigationZone (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    actuator_id: Optional[UUID] = None
    sensor_moisture_id: Optional[UUID] = None
    sensor_flow_id: Optional[UUID] = None
    metadata: Optional[dict] = None


class IrrigationZoneOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    name: str
    actuator_id: Optional[UUID] = None
    sensor_moisture_id: Optional[UUID] = None
    sensor_flow_id: Optional[UUID] = None
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IrrigationZoneMinimalOut(BaseModel):
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


class IrrigationZonePage(BaseModel):
    """Paginated response for IrrigationZones"""
    items: list[IrrigationZoneOut]
    meta: PageMeta
