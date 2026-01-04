from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class DeviceCreate(BaseModel):
    """DTO for creating a Device"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    device_type: str = Field(..., min_length=1, max_length=50)
    serial: str = Field(..., min_length=1, max_length=120)
    fw_version: Optional[str] = Field(None, min_length=1, max_length=50, nullable=True)
    status: str = Field(..., min_length=1, max_length=30)
    last_seen_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class DeviceUpdate(BaseModel):
    """DTO for updating a Device (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    device_type: str = Field(..., min_length=1, max_length=50)
    serial: str = Field(..., min_length=1, max_length=120)
    fw_version: Optional[str] = Field(None, min_length=1, max_length=50, nullable=True)
    status: str = Field(..., min_length=1, max_length=30)
    last_seen_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class DeviceOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    name: str
    device_type: str
    serial: str
    fw_version: Optional[str] = None
    status: str
    last_seen_at: Optional[datetime] = None
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DeviceMinimalOut(BaseModel):
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


class DevicePage(BaseModel):
    """Paginated response for Devices"""
    items: list[DeviceOut]
    meta: PageMeta
