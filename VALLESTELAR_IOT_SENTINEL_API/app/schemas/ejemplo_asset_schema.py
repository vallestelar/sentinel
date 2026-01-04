# app/schemas/Asset_schema.py
from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AssetCreate(BaseModel):
    """DTO for creating a Asset"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=255, nullable=True)
    asset_type_id: UUID
    area_id: UUID
    code: str = Field(..., min_length=1, max_length=100)
    parent_id: Optional[UUID] = None
    manufacturer: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    install_date: Optional[datetime] = None
    criticality: Optional[int] = None
    metadata: Optional[dict] = None
    

class AssetUpdate(BaseModel):
    """DTO for updating a Asset (optional fields)"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=255, nullable=True)
    asset_type_id: UUID
    area_id: UUID
    code: str = Field(..., min_length=1, max_length=100)
    parent_id: Optional[UUID] = None
    manufacturer: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    install_date: Optional[datetime] = None
    criticality: Optional[int] = None
    metadata: Optional[dict] = None
    

class AssetOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    name: str
    description: str
    asset_type_id: UUID
    area_id: UUID
    code: str
    parent_id: Optional[UUID] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    install_date: Optional[datetime] = None
    criticality: Optional[int] = None
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    # For Pydantic to map from ORM/Tortoise objects
    model_config = ConfigDict(from_attributes=True)
    
class AssetMinimalOut(BaseModel):
    """Minimal DTO for output (what is returned in the API)"""
    id: UUID
    name: str

    # For Pydantic to map from ORM/Tortoise objects
    model_config = ConfigDict(from_attributes=True)   


class PageMeta(BaseModel):
    """Metadata for pagination"""
    total: int
    page: int
    page_size: int
    pages: int


class AssetPage(BaseModel):
    """Paginated response for Assets"""
    items: list[AssetOut]
    meta: PageMeta
