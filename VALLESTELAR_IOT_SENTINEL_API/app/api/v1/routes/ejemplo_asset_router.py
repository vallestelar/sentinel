# app/api/v1/assetType_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities.ejemplo_asset import Asset
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.schemas.ejemplo_asset_schema import (
    AssetCreate,
    AssetUpdate,
    AssetOut,
    AssetPage,
    PageMeta,
  
)

from app.core.auth.dependencies import require_access_token
#router = APIRouter(prefix="/api/v1/asset", tags=["Asset"], dependencies=[Depends(require_access_token())])
router = APIRouter(prefix="/api/v1/asset", tags=["Asset"])

# ---- Dependency for injecting the generic service ----
async def get_asset_service() -> GenericService[Asset]:
    return service_factory.get(Asset)


# ---------- CREATE ----------
@router.post("/", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
async def create_asset(
    payload: AssetCreate,
    svc: GenericService[Asset] = Depends(get_asset_service),
):
    try:
        obj = await svc.create(**payload.model_dump())
        return AssetOut.model_validate(obj)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Asset with same name or key already exists",
        )


# ---------- READ (by id) ----------
@router.get("/{asset_id}", response_model=AssetOut)
async def get_asset(
    asset_id: UUID,
    svc: GenericService[Asset] = Depends(get_asset_service),
):
    obj = await svc.get(asset_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return AssetOut.model_validate(obj)


# ---------- LIST (simple) ----------
#@router.get("/", response_model=list[AssetOut])
async def list_assets(
    q: Optional[str] = Query(None, description="Search by name/key (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    limit: Optional[int] = Query(50, ge=1, le=500),
    offset: Optional[int] = Query(0, ge=0),
    svc: GenericService[Asset] = Depends(get_asset_service),
):
    filters = {}
    if q:
        filters["name__icontains"] = q

    items = await svc.list(
        order_by=order_by,
        limit=limit,
        offset=offset,
        **filters,
    )
    return [AssetTypeOut.model_validate(x) for x in items]


# ---------- LIST (paginado) ----------
@router.get("/", response_model=AssetPage)
async def list_assets_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search by name/key (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[Asset] = Depends(get_asset_service),
):
    filters = {}
    if q:
        filters["name__icontains"] = q

    result = await svc.list_paginated(
        page=page,
        page_size=page_size,
        order_by=order_by,
        **filters,
    )
    return AssetPage(
        items=[AssetOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


# ---------- UPDATE ----------
@router.patch("/{asset_id}", response_model=AssetOut)
async def update_asset(
    asset_id: UUID,
    payload: AssetUpdate,
    svc: GenericService[Asset] = Depends(get_asset_service),
):
    try:
        updated = await svc.update(asset_id, **payload.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        return AssetOut.model_validate(updated)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Asset with same name or key already exists",
        )


# ---------- DELETE ----------
@router.delete("/{asset_id}", status_code=status.HTTP_200_OK)
async def delete_asset(
    asset_id: UUID,
    svc: GenericService[Asset] = Depends(get_asset_service),
):
    deleted = await svc.delete(asset_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return {"deleted": deleted}


# ---------- READ (by id) ----------
@router.post("/{asset_id}/viewdata")
async def get_asset_view_data(
    asset_id: UUID,
    req: AssetViewRequest,):
    
    vds = ViewDataAssetService()   
    obj = await vds.process_asset_data(asset_id,req)
    return obj
    # if not obj:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    # return AssetOut.model_validate(obj)