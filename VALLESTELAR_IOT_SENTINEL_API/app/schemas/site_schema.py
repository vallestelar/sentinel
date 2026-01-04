from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class SiteCreate(BaseModel):
    """DTO for creating a Site"""
    tenant_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    address_text: Optional[str] = Field(None, min_length=1, max_length=255, nullable=True)
    timezone: str = Field(..., min_length=1, max_length=64)
    lat: Optional[float] = None
    lng: Optional[float] = None
    metadata: Optional[dict] = None


class SiteUpdate(BaseModel):
    """DTO for updating a Site (optional fields)"""
    tenant_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    address_text: Optional[str] = Field(None, min_length=1, max_length=255, nullable=True)
    timezone: str = Field(..., min_length=1, max_length=64)
    lat: Optional[float] = None
    lng: Optional[float] = None
    metadata: Optional[dict] = None


class SiteOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    name: str
    address_text: Optional[str] = None
    timezone: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SiteMinimalOut(BaseModel):
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


class SitePage(BaseModel):
    """Paginated response for Sites"""
    items: list[SiteOut]
    meta: PageMeta
