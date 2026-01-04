from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class UserCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)  # ✅
    full_name: Optional[str] = Field(None, min_length=1, max_length=150)
    status: str = Field(..., min_length=1, max_length=30)
    metadata: Optional[dict] = None
    
class UserUpdate(BaseModel):
    """DTO for updating a User (optional fields)"""
    email: str = Field(..., min_length=3, max_length=255)
    password_hash: str = Field(..., min_length=1, max_length=255)
    full_name: Optional[str] = Field(None, min_length=1, max_length=150, nullable=True)
    status: str = Field(..., min_length=1, max_length=30)
    metadata: Optional[dict] = None


class UserOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    email: str
    password_hash: str
    full_name: Optional[str] = None
    status: str
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserMinimalOut(BaseModel):
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


class UserPage(BaseModel):
    """Paginated response for Users"""
    items: list[UserOut]
    meta: PageMeta
