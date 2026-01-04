# app/api/v1/user_router.py
from __future__ import annotations
from typing import Optional, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.exceptions import IntegrityError

from app.models.entities import User
from app.services.generic_service import GenericService
from app.services.service_factory import service_factory

from app.core.security.passwords import hash_password
from tortoise.transactions import in_transaction
from app.models.entities import UserMembership
from app.schemas.user_onboard_schema import UserOnboardCreate

from app.schemas.user_schema import (
    UserCreate,
    UserUpdate,
    UserOut,
    UserPage,
    PageMeta,
)

from app.core.auth.dependencies import require_access_token
router = APIRouter(prefix="/api/v1/users", tags=["Users"])


async def get_user_service() -> GenericService[User]:
    return service_factory.get(User)

@router.post("/onboard", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def onboard_user(payload: UserOnboardCreate):
    """
    Crea un usuario y su membership para un tenant en una única transacción.
    - Crea User con password hasheada (password_hash)
    - Crea UserMembership con tenant_id + role
    """
    try:
        async with in_transaction():
            # 1) Crear User
            user = await User.create(
                email=payload.email,
                password_hash=hash_password(payload.password),
                full_name=payload.full_name,
                status=payload.status,
                metadata=payload.user_metadata or {},

                # si en su tabla users son NOT NULL, mantenga esto:
                created_by="system",
                updated_by="system",
            )

            # 2) Crear Membership (NOT NULL: metadata, created_by, updated_by)
            await UserMembership.create(
                user_id=user.id,
                tenant_id=payload.tenant_id,
                role=payload.role,
                metadata=payload.membership_metadata or {},

                created_by="system",
                updated_by="system",
            )

        return UserOut.model_validate(user)

    except IntegrityError:
        # Puede ser email duplicado o unique(user_id, tenant_id) si lo añade luego
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflicto al crear usuario o membership (posible duplicado).",
        )


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    svc: GenericService[User] = Depends(get_user_service),
):
    try:
        data = payload.model_dump()

        password = data.pop("password", None)
        if not password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="password es obligatoria",
            )

        # ✅ su entidad usa password_hash
        data["password_hash"] = hash_password(password)

        obj = await svc.create(**data)
        return UserOut.model_validate(obj)

    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with same unique key already exists",
        )


@router.get("/{obj_id}", response_model=UserOut)
async def get_user(
    obj_id: UUID,
    svc: GenericService[User] = Depends(get_user_service),
):
    obj = await svc.get(obj_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut.model_validate(obj)


@router.get("/", response_model=UserPage)
async def list_user_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Search (icontains)"),
    order_by: Optional[Sequence[str]] = Query(None, description='Order fields, e.g: ["name","-created_at"]'),
    svc: GenericService[User] = Depends(get_user_service),
):
    filters: dict = {}
    if q:
        filters["email__icontains"] = q

    result = await svc.list_paginated(
        page=page,
        page_size=page_size,
        order_by=order_by,
        **filters,
    )
    return UserPage(
        items=[UserOut.model_validate(x) for x in result.items],
        meta=PageMeta(total=result.total, page=result.page, page_size=result.page_size, pages=result.pages),
    )


@router.patch("/{obj_id}", response_model=UserOut)
async def update_user(
    obj_id: UUID,
    payload: UserUpdate,
    svc: GenericService[User] = Depends(get_user_service),
):
    try:
        data = payload.model_dump(exclude_unset=True)

        if "password" in data:
            new_password = data.pop("password")
            if not new_password:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="password no puede ser vacía",
                )
            data["password_hash"] = hash_password(new_password)

        updated = await svc.update(obj_id, **data)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return UserOut.model_validate(updated)

    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with same unique key already exists",
        )


@router.delete("/{obj_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    obj_id: UUID,
    svc: GenericService[User] = Depends(get_user_service),
):
    deleted = await svc.delete(obj_id)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"deleted": deleted}
