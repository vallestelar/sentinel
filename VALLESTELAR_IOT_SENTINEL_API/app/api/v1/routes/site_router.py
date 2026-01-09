# app/api/v1/site_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import Site, Tenant
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.site_schema import (
    SiteCreate,
    SiteUpdate,
    SiteOut,
    SitePage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
# router = APIRouter(prefix="/api/v1/sites", tags=["Sites"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/sites", tags=["Sites"],dependencies=[Depends(require_access_token())])

async def get_site_service() -> GenericService[Site]:
    return service_factory.get(Site)


@router.post("/", response_model=SiteOut, status_code=status.HTTP_201_CREATED)
async def create_site(
    payload: SiteCreate,
    svc: GenericService[Site] = Depends(get_site_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return SiteOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Site with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=SiteOut)
async def get_site(
    obj_id: UUID,
    svc: GenericService[Site] = Depends(get_site_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return SiteOut.model_validate(obj)


@router.get("/", response_model=SitePage)
async def list_site_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[Site] = Depends(get_site_service),
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
    return SitePage(
        items=[SiteOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=SiteOut)
async def update_site(
    obj_id: UUID,
    payload: SiteUpdate,
    svc: GenericService[Site] = Depends(get_site_service),
):
    try:
        updated = await svc.update(obj_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
        return SiteOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Site with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_site(
    obj_id: UUID,
    svc: GenericService[Site] = Depends(get_site_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return {"deleted": deleted}


@router.get("/{tenant_id}/sites", response_model=SitePage)
async def list_sites_by_tenant(
    tenant_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[Site] = Depends(get_site_service),
):
    filters: dict = {"tenant_id": tenant_id}

    if q:
        filters["name__icontains"] = q

    result = await svc.list_paginated(
        page=page,
        page_size=page_size,
        order_by=order_by,
        **filters,
    )

    return SitePage(
        items=[SiteOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )
