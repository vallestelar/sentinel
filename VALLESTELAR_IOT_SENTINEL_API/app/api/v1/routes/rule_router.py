# app/api/v1/rule_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import Rule
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.rule_schema import (
    RuleCreate,
    RuleUpdate,
    RuleOut,
    RulePage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/rules", tags=["Rules"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/rules", tags=["Rules"])


async def get_rule_service() -> GenericService[Rule]:
    return service_factory.get(Rule)


@router.post("/", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(
    payload: RuleCreate,
    svc: GenericService[Rule] = Depends(get_rule_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return RuleOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rule with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=RuleOut)
async def get_rule(
    obj_id: UUID,
    svc: GenericService[Rule] = Depends(get_rule_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return RuleOut.model_validate(obj)


@router.get("/", response_model=RulePage)
async def list_rule_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[Rule] = Depends(get_rule_service),
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
    return RulePage(
        items=[RuleOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=RuleOut)
async def update_rule(
    obj_id: UUID,
    payload: RuleUpdate,
    svc: GenericService[Rule] = Depends(get_rule_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        return RuleOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rule with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_rule(
    obj_id: UUID,
    svc: GenericService[Rule] = Depends(get_rule_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return {"deleted": deleted}
