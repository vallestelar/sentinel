from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class EventCreate(BaseModel):
    """DTO for creating a Event"""
    tenant_id: UUID
    site_id: UUID
    event_type: str = Field(..., min_length=1, max_length=50)
    severity: str = Field(..., min_length=1, max_length=15)
    source_type: Optional[str] = Field(None, min_length=1, max_length=20, nullable=True)
    source_id: Optional[UUID] = None
    ts: datetime
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=2000, nullable=True)
    ack_status: str = Field(..., min_length=1, max_length=20)
    ack_by_id: Optional[UUID] = None
    ack_at: Optional[datetime] = None
    meta: Optional[dict] = None


class EventUpdate(BaseModel):
    """DTO for updating a Event (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    event_type: str = Field(..., min_length=1, max_length=50)
    severity: str = Field(..., min_length=1, max_length=15)
    source_type: Optional[str] = Field(None, min_length=1, max_length=20, nullable=True)
    source_id: Optional[UUID] = None
    ts: datetime
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=2000, nullable=True)
    ack_status: str = Field(..., min_length=1, max_length=20)
    ack_by_id: Optional[UUID] = None
    ack_at: Optional[datetime] = None
    meta: Optional[dict] = None


class EventOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    event_type: str
    severity: str
    source_type: Optional[str] = None
    source_id: Optional[UUID] = None
    ts: datetime
    title: str
    description: Optional[str] = None
    ack_status: str
    ack_by_id: Optional[UUID] = None
    ack_at: Optional[datetime] = None
    meta: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EventMinimalOut(BaseModel):
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


class EventPage(BaseModel):
    """Paginated response for Events"""
    items: list[EventOut]
    meta: PageMeta
