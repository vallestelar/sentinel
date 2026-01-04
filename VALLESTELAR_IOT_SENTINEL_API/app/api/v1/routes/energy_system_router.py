# app/api/v1/energy_system_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import EnergySystem
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.energy_system_schema import (
    EnergySystemCreate,
    EnergySystemUpdate,
    EnergySystemOut,
    EnergySystemPage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/energy-systems", tags=["EnergySystems"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/energy-systems", tags=["EnergySystems"])


async def get_energy_system_service() -> GenericService[EnergySystem]:
    return service_factory.get(EnergySystem)


@router.post("/", response_model=EnergySystemOut, status_code=status.HTTP_201_CREATED)
async def create_energy_system(
    payload: EnergySystemCreate,
    svc: GenericService[EnergySystem] = Depends(get_energy_system_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return EnergySystemOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="EnergySystem with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=EnergySystemOut)
async def get_energy_system(
    obj_id: UUID,
    svc: GenericService[EnergySystem] = Depends(get_energy_system_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EnergySystem not found")
    return EnergySystemOut.model_validate(obj)


@router.get("/", response_model=EnergySystemPage)
async def list_energy_system_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[EnergySystem] = Depends(get_energy_system_service),
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
    return EnergySystemPage(
        items=[EnergySystemOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=EnergySystemOut)
async def update_energy_system(
    obj_id: UUID,
    payload: EnergySystemUpdate,
    svc: GenericService[EnergySystem] = Depends(get_energy_system_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EnergySystem not found")
        return EnergySystemOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="EnergySystem with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_energy_system(
    obj_id: UUID,
    svc: GenericService[EnergySystem] = Depends(get_energy_system_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EnergySystem not found")
    return {"deleted": deleted}
