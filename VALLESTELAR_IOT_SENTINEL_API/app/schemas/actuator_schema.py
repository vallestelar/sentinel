from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class ActuatorCreate(BaseModel):
    """DTO for creating a Actuator"""
    tenant_id: UUID
    site_id: UUID
    device_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    actuator_type: str = Field(..., min_length=1, max_length=50)
    channel: Optional[str] = Field(None, min_length=1, max_length=50, nullable=True)
    state: Optional[dict] = None
    is_enabled: bool
    metadata: Optional[dict] = None


class ActuatorUpdate(BaseModel):
    """DTO for updating a Actuator (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    device_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    actuator_type: str = Field(..., min_length=1, max_length=50)
    channel: Optional[str] = Field(None, min_length=1, max_length=50, nullable=True)
    state: Optional[dict] = None
    is_enabled: bool
    metadata: Optional[dict] = None


class ActuatorOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    device_id: UUID
    name: str
    actuator_type: str
    channel: Optional[str] = None
    state: Optional[dict] = None
    is_enabled: bool
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ActuatorMinimalOut(BaseModel):
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


class ActuatorPage(BaseModel):
    """Paginated response for Actuators"""
    items: list[ActuatorOut]
    meta: PageMeta
