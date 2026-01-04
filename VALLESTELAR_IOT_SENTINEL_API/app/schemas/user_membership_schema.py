from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class UserMembershipCreate(BaseModel):
    """DTO for creating a UserMembership"""
    user_id: UUID
    tenant_id: UUID
    role: str = Field(..., min_length=1, max_length=30)
    metadata: Optional[dict] = None


class UserMembershipUpdate(BaseModel):
    """DTO for updating a UserMembership (optional fields)"""
    user_id: UUID
    tenant_id: UUID
    role: str = Field(..., min_length=1, max_length=30)
    metadata: Optional[dict] = None


class UserMembershipOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    user_id: UUID
    tenant_id: UUID
    role: str
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserMembershipMinimalOut(BaseModel):
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


class UserMembershipPage(BaseModel):
    """Paginated response for UserMemberships"""
    items: list[UserMembershipOut]
    meta: PageMeta
