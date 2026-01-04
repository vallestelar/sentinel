from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class TenantCreate(BaseModel):
    """DTO for creating a Tenant"""
    name: str = Field(..., min_length=1, max_length=150)
    rut: Optional[str] = Field(None, min_length=1, max_length=30, nullable=True)
    plan: str = Field(..., min_length=1, max_length=30)
    status: str = Field(..., min_length=1, max_length=30)
    metadata: Optional[dict] = None


class TenantUpdate(BaseModel):
    """DTO for updating a Tenant (optional fields)"""
    name: str = Field(..., min_length=1, max_length=150)
    rut: Optional[str] = Field(None, min_length=1, max_length=30, nullable=True)
    plan: str = Field(..., min_length=1, max_length=30)
    status: str = Field(..., min_length=1, max_length=30)
    metadata: Optional[dict] = None


class TenantOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    name: str
    rut: Optional[str] = None
    plan: str
    status: str
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TenantMinimalOut(BaseModel):
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


class TenantPage(BaseModel):
    """Paginated response for Tenants"""
    items: list[TenantOut]
    meta: PageMeta
