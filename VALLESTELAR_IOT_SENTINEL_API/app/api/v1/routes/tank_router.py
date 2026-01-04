# app/api/v1/tank_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import Tank
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.tank_schema import (
    TankCreate,
    TankUpdate,
    TankOut,
    TankPage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/tanks", tags=["Tanks"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/tanks", tags=["Tanks"])


async def get_tank_service() -> GenericService[Tank]:
    return service_factory.get(Tank)


@router.post("/", response_model=TankOut, status_code=status.HTTP_201_CREATED)
async def create_tank(
    payload: TankCreate,
    svc: GenericService[Tank] = Depends(get_tank_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return TankOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tank with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=TankOut)
async def get_tank(
    obj_id: UUID,
    svc: GenericService[Tank] = Depends(get_tank_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")
    return TankOut.model_validate(obj)


@router.get("/", response_model=TankPage)
async def list_tank_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[Tank] = Depends(get_tank_service),
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
    return TankPage(
        items=[TankOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=TankOut)
async def update_tank(
    obj_id: UUID,
    payload: TankUpdate,
    svc: GenericService[Tank] = Depends(get_tank_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")
        return TankOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tank with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_tank(
    obj_id: UUID,
    svc: GenericService[Tank] = Depends(get_tank_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")
    return {"deleted": deleted}
