from __future__ import annotations
from typing import Any, Generic, Optional, Sequence, Type, TypeVar
from tortoise.models import Model
from tortoise.expressions import Q

from app.dbs.postgres.generic_repository import GenericRepository as Repository

T = TypeVar("T", bound=Model)

class GenericService(Generic[T]):
    """
    Generic Service for Tortoise models.
    Delegates to Repository[T].
    Includes CRUD, listing, pagination, filtering, ordering, and relationship loading.
    """

    def __init__(
        self,
        model: Type[T],
        repo: Optional[Repository[T]] = None,
        *,
        default_filters: Optional[dict[str, Any]] = None,
    ) -> None:
        self.model = model
        self.repo = repo or Repository[T](model, default_filters=default_filters)

    # ---------- CRUD ----------
    async def create(self, **data: Any) -> T:
        return await self.repo.create(**data)

    async def get(self, pk: Any, *, related: Optional[Sequence[str]] = None) -> T | None:
        return await self.repo.get(pk, related=related)

    async def update(self, pk: Any, **changes: Any) -> T | None:
        return await self.repo.update(pk, **changes)

    async def delete(self, pk: Any) -> int:
        return await self.repo.delete(pk)
    
    async def get_with_related(
        self,
        pk: Any,
        *,
        related=None,
        prefetch=None,
        values: bool = False,
        only_fields=None,
        flatten: bool = False,
    ):
        return await self.repo.get_with_related(
            pk,
            related=related,
            prefetch=prefetch,
            values=values,
            only_fields=only_fields,
            flatten=flatten,
        )
    # ---------- READS ----------
    async def first(self, *q: Q, related: Optional[Sequence[str]] = None, **filters: Any) -> T | None:
        return await self.repo.first(*q, related=related, **filters)

    async def exists(self, *q: Q, **filters: Any) -> bool:
        return await self.repo.exists(*q, **filters)

    async def count(self, *q: Q, **filters: Any) -> int:
        return await self.repo.count(*q, **filters)

    async def list(
        self,
        *q: Q,
        related: Optional[Sequence[str]] = None,
        order_by: Optional[Sequence[str]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **filters: Any,
    ) -> list[T]:
        return await self.repo.list(
            *q,
            related=related,
            order_by=order_by,
            limit=limit,
            offset=offset,
            **filters,
        )

    async def list_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        *q: Q,
        related: Optional[Sequence[str]] = None,
        order_by: Optional[Sequence[str]] = None,
        **filters: Any,
    ):
        # Returns the PageResult from your repo
        return await self.repo.list_paginated(
            page=page,
            page_size=page_size,
            *q,
            related=related,
            order_by=order_by,
            **filters,
        )

    # ---------- M2M relations (helpers) ----------
    async def add_m2m(self, instance: T, relation: str, targets: list[Model]) -> None:
        await self.repo.add_m2m(instance, relation, targets)

    async def remove_m2m(self, instance: T, relation: str, targets: list[Model]) -> None:
        await self.repo.remove_m2m(instance, relation, targets)
