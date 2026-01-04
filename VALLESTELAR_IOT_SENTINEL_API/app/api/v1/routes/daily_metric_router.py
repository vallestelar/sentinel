# app/api/v1/daily_metric_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import DailyMetric
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.daily_metric_schema import (
    DailyMetricCreate,
    DailyMetricUpdate,
    DailyMetricOut,
    DailyMetricPage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/daily-metrics", tags=["DailyMetrics"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/daily-metrics", tags=["DailyMetrics"])


async def get_daily_metric_service() -> GenericService[DailyMetric]:
    return service_factory.get(DailyMetric)


@router.post("/", response_model=DailyMetricOut, status_code=status.HTTP_201_CREATED)
async def create_daily_metric(
    payload: DailyMetricCreate,
    svc: GenericService[DailyMetric] = Depends(get_daily_metric_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return DailyMetricOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="DailyMetric with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=DailyMetricOut)
async def get_daily_metric(
    obj_id: UUID,
    svc: GenericService[DailyMetric] = Depends(get_daily_metric_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DailyMetric not found")
    return DailyMetricOut.model_validate(obj)


@router.get("/", response_model=DailyMetricPage)
async def list_daily_metric_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[DailyMetric] = Depends(get_daily_metric_service),
):
    filters: dict = {}
    if q:
        filters["metric_key__icontains"] = q

    result = await svc.list_paginated(
        page=page,
        page_size=page_size,
        order_by=order_by,
        **filters,
    )
    return DailyMetricPage(
        items=[DailyMetricOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=DailyMetricOut)
async def update_daily_metric(
    obj_id: UUID,
    payload: DailyMetricUpdate,
    svc: GenericService[DailyMetric] = Depends(get_daily_metric_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DailyMetric not found")
        return DailyMetricOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="DailyMetric with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_daily_metric(
    obj_id: UUID,
    svc: GenericService[DailyMetric] = Depends(get_daily_metric_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DailyMetric not found")
    return {"deleted": deleted}
