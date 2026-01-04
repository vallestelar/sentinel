from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class SensorCreate(BaseModel):
    """DTO for creating a Sensor"""
    tenant_id: UUID
    site_id: UUID
    device_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    sensor_type: str = Field(..., min_length=1, max_length=50)
    unit: Optional[str] = Field(None, min_length=1, max_length=20, nullable=True)
    calibration_json: Optional[dict] = None
    is_enabled: bool
    metadata: Optional[dict] = None


class SensorUpdate(BaseModel):
    """DTO for updating a Sensor (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    device_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    sensor_type: str = Field(..., min_length=1, max_length=50)
    unit: Optional[str] = Field(None, min_length=1, max_length=20, nullable=True)
    calibration_json: Optional[dict] = None
    is_enabled: bool
    metadata: Optional[dict] = None


class SensorOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    device_id: UUID
    name: str
    sensor_type: str
    unit: Optional[str] = None
    calibration_json: Optional[dict] = None
    is_enabled: bool
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SensorMinimalOut(BaseModel):
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


class SensorPage(BaseModel):
    """Paginated response for Sensors"""
    items: list[SensorOut]
    meta: PageMeta
