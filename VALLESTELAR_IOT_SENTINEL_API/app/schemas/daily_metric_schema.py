from __future__ import annotations
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class DailyMetricCreate(BaseModel):
    """DTO for creating a DailyMetric"""
    tenant_id: UUID
    site_id: UUID
    metric_date: date
    metric_key: str = Field(..., min_length=1, max_length=120)
    value: float
    meta: Optional[dict] = None


class DailyMetricUpdate(BaseModel):
    """DTO for updating a DailyMetric (optional fields)"""
    tenant_id: UUID
    site_id: UUID
    metric_date: date
    metric_key: str = Field(..., min_length=1, max_length=120)
    value: float
    meta: Optional[dict] = None


class DailyMetricOut(BaseModel):
    """DTO for output (what is returned in the API)"""
    id: UUID
    tenant_id: UUID
    site_id: UUID
    metric_date: date
    metric_key: str
    value: float
    meta: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DailyMetricMinimalOut(BaseModel):
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


class DailyMetricPage(BaseModel):
    """Paginated response for DailyMetrics"""
    items: list[DailyMetricOut]
    meta: PageMeta
