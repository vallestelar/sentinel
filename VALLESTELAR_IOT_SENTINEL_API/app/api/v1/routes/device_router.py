# app/api/v1/device_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import Device
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.device_schema import (
    DeviceCreate,
    DeviceUpdate,
    DeviceOut,
    DevicePage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/devices", tags=["Devices"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/devices", tags=["Devices"])


async def get_device_service() -> GenericService[Device]:
    return service_factory.get(Device)


@router.post("/", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
async def create_device(
    payload: DeviceCreate,
    svc: GenericService[Device] = Depends(get_device_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return DeviceOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Device with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=DeviceOut)
async def get_device(
    obj_id: UUID,
    svc: GenericService[Device] = Depends(get_device_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return DeviceOut.model_validate(obj)


@router.get("/", response_model=DevicePage)
async def list_device_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[Device] = Depends(get_device_service),
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
    return DevicePage(
        items=[DeviceOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=DeviceOut)
async def update_device(
    obj_id: UUID,
    payload: DeviceUpdate,
    svc: GenericService[Device] = Depends(get_device_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        return DeviceOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Device with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_device(
    obj_id: UUID,
    svc: GenericService[Device] = Depends(get_device_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return {"deleted": deleted}
