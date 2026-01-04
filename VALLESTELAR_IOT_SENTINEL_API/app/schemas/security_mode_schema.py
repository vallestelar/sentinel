from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class SecurityModeCreate(BaseModel):
    """DTO for creating a SecurityMode"""
    tenant_id: UUID
    site_id: UUID
    mode: str = Field(..., min_length=1, max_length=20)
    is_armed: bool
    metadata: Optional[dict] = None


class SecurityModeUpdate(BaseModel):
    """DTO for updating a SecurityMode (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    mode: str = Field(..., min_length=1, max_length=20)
    is_armed: bool
    metadata: Optional[dict] = None


class SecurityModeOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    mode: str
    is_armed: bool
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SecurityModeMinimalOut(BaseModel):
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


class SecurityModePage(BaseModel):
    """Paginated response for SecurityModes"""
    items: list[SecurityModeOut]
    meta: PageMeta
