# app/api/v1/actuator_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import Actuator
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.actuator_schema import (
    ActuatorCreate,
    ActuatorUpdate,
    ActuatorOut,
    ActuatorPage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/actuators", tags=["Actuators"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/actuators", tags=["Actuators"])


async def get_actuator_service() -> GenericService[Actuator]:
    return service_factory.get(Actuator)


@router.post("/", response_model=ActuatorOut, status_code=status.HTTP_201_CREATED)
async def create_actuator(
    payload: ActuatorCreate,
    svc: GenericService[Actuator] = Depends(get_actuator_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return ActuatorOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Actuator with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=ActuatorOut)
async def get_actuator(
    obj_id: UUID,
    svc: GenericService[Actuator] = Depends(get_actuator_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Actuator not found")
    return ActuatorOut.model_validate(obj)


@router.get("/", response_model=ActuatorPage)
async def list_actuator_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[Actuator] = Depends(get_actuator_service),
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
    return ActuatorPage(
        items=[ActuatorOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=ActuatorOut)
async def update_actuator(
    obj_id: UUID,
    payload: ActuatorUpdate,
    svc: GenericService[Actuator] = Depends(get_actuator_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Actuator not found")
        return ActuatorOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Actuator with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_actuator(
    obj_id: UUID,
    svc: GenericService[Actuator] = Depends(get_actuator_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Actuator not found")
    return {"deleted": deleted}
