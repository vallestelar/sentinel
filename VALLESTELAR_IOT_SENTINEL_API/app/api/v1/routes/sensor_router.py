# app/api/v1/sensor_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import Sensor
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.sensor_schema import (
    SensorCreate,
    SensorUpdate,
    SensorOut,
    SensorPage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/sensors", tags=["Sensors"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/sensors", tags=["Sensors"])


async def get_sensor_service() -> GenericService[Sensor]:
    return service_factory.get(Sensor)


@router.post("/", response_model=SensorOut, status_code=status.HTTP_201_CREATED)
async def create_sensor(
    payload: SensorCreate,
    svc: GenericService[Sensor] = Depends(get_sensor_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return SensorOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sensor with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=SensorOut)
async def get_sensor(
    obj_id: UUID,
    svc: GenericService[Sensor] = Depends(get_sensor_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor not found")
    return SensorOut.model_validate(obj)


@router.get("/", response_model=SensorPage)
async def list_sensor_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[Sensor] = Depends(get_sensor_service),
):
    filters: dict = {}
    if q:
        filters["name__icontains"] = q

    result = await svc.list_paginated(
        page=page,
        page_size=page_size,
        order_by=order_by,
        **filters,
    )
    return SensorPage(
        items=[SensorOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=SensorOut)
async def update_sensor(
    obj_id: UUID,
    payload: SensorUpdate,
    svc: GenericService[Sensor] = Depends(get_sensor_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor not found")
        return SensorOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sensor with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_sensor(
    obj_id: UUID,
    svc: GenericService[Sensor] = Depends(get_sensor_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor not found")
    return {"deleted": deleted}



