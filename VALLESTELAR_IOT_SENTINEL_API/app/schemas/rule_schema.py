from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class RuleCreate(BaseModel):
    """DTO for creating a Rule"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    area: str = Field(..., min_length=1, max_length=30)
    condition_json: Optional[dict] = None
    action_json: Optional[dict] = None
    is_enabled: bool
    metadata: Optional[dict] = None


class RuleUpdate(BaseModel):
    """DTO for updating a Rule (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    area: str = Field(..., min_length=1, max_length=30)
    condition_json: Optional[dict] = None
    action_json: Optional[dict] = None
    is_enabled: bool
    metadata: Optional[dict] = None


class RuleOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    name: str
    area: str
    condition_json: Optional[dict] = None
    action_json: Optional[dict] = None
    is_enabled: bool
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RuleMinimalOut(BaseModel):
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


class RulePage(BaseModel):
    """Paginated response for Rules"""
    items: list[RuleOut]
    meta: PageMeta
