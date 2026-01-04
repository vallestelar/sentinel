# app/api/v1/sensor_reading_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import SensorReading
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.sensor_reading_schema import (
    SensorReadingCreate,
    SensorReadingUpdate,
    SensorReadingOut,
    SensorReadingPage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/sensor-readings", tags=["SensorReadings"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/sensor-readings", tags=["SensorReadings"])


async def get_sensor_reading_service() -> GenericService[SensorReading]:
    return service_factory.get(SensorReading)


@router.post("/", response_model=SensorReadingOut, status_code=status.HTTP_201_CREATED)
async def create_sensor_reading(
    payload: SensorReadingCreate,
    svc: GenericService[SensorReading] = Depends(get_sensor_reading_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return SensorReadingOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SensorReading with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=SensorReadingOut)
async def get_sensor_reading(
    obj_id: UUID,
    svc: GenericService[SensorReading] = Depends(get_sensor_reading_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SensorReading not found")
    return SensorReadingOut.model_validate(obj)


@router.get("/", response_model=SensorReadingPage)
async def list_sensor_reading_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[SensorReading] = Depends(get_sensor_reading_service),
):
    filters: dict = {}
    # This entity does not have a default text search field.
    # Add your own filters here if needed.

    result = await svc.list_paginated(
        page=page,
        page_size=page_size,
        order_by=order_by,
        **filters,
    )
    return SensorReadingPage(
        items=[SensorReadingOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=SensorReadingOut)
async def update_sensor_reading(
    obj_id: UUID,
    payload: SensorReadingUpdate,
    svc: GenericService[SensorReading] = Depends(get_sensor_reading_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SensorReading not found")
        return SensorReadingOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SensorReading with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_sensor_reading(
    obj_id: UUID,
    svc: GenericService[SensorReading] = Depends(get_sensor_reading_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SensorReading not found")
    return {"deleted": deleted}
