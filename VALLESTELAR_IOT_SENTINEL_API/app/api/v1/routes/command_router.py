# app/api/v1/command_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import Command
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.command_schema import (
    CommandCreate,
    CommandUpdate,
    CommandOut,
    CommandPage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/commands", tags=["Commands"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/commands", tags=["Commands"])


async def get_command_service() -> GenericService[Command]:
    return service_factory.get(Command)


@router.post("/", response_model=CommandOut, status_code=status.HTTP_201_CREATED)
async def create_command(
    payload: CommandCreate,
    svc: GenericService[Command] = Depends(get_command_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return CommandOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Command with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=CommandOut)
async def get_command(
    obj_id: UUID,
    svc: GenericService[Command] = Depends(get_command_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Command not found")
    return CommandOut.model_validate(obj)


@router.get("/", response_model=CommandPage)
async def list_command_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[Command] = Depends(get_command_service),
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
    return CommandPage(
        items=[CommandOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=CommandOut)
async def update_command(
    obj_id: UUID,
    payload: CommandUpdate,
    svc: GenericService[Command] = Depends(get_command_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Command not found")
        return CommandOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Command with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_command(
    obj_id: UUID,
    svc: GenericService[Command] = Depends(get_command_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Command not found")
    return {"deleted": deleted}
