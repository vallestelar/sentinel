from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class EnergySystemCreate(BaseModel):
    """DTO for creating a EnergySystem"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    battery_capacity_ah: Optional[float] = None
    sensor_battery_voltage_id: Optional[UUID] = None
    sensor_solar_power_id: Optional[UUID] = None
    metadata: Optional[dict] = None


class EnergySystemUpdate(BaseModel):
    """DTO for updating a EnergySystem (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    battery_capacity_ah: Optional[float] = None
    sensor_battery_voltage_id: Optional[UUID] = None
    sensor_solar_power_id: Optional[UUID] = None
    metadata: Optional[dict] = None


class EnergySystemOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    name: str
    battery_capacity_ah: Optional[float] = None
    sensor_battery_voltage_id: Optional[UUID] = None
    sensor_solar_power_id: Optional[UUID] = None
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EnergySystemMinimalOut(BaseModel):
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


class EnergySystemPage(BaseModel):
    """Paginated response for EnergySystems"""
    items: list[EnergySystemOut]
    meta: PageMeta
