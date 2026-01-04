from __future__ import annotations
from typing import Any, Generic, Iterable, List, Optional, Sequence, Type, TypeVar, Union
from dataclasses import dataclass
from tortoise.queryset import QuerySet
from tortoise.models import Model
from tortoise.queryset import QuerySet
from tortoise.expressions import Q

from uuid6 import uuid7
from datetime import datetime, timezone

T = TypeVar("T", bound=Model)

@dataclass
class PageResult(Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int

class GenericRepository(Generic[T]):
    """
    Generic repository for Tortoise models.
    - Filters: use kwargs in Tortoise style (e.g. name__icontains="a", created_at__gte=..., etc.)
    - Q objects: filter complex OR/AND (e.g. Q(name__icontains="a") | Q(email__icontains="a"))
    - Ordering: ["-created_at", "name"]
    - Relationships: select_related/prefetch_related passing names in `related`
    """

    def __init__(self, model: Type[T], *, default_filters: Optional[dict[str, Any]] = None):
        self.model = model
        self.default_filters = default_filters or {}

    # ------- helpers -------
    @property
    def pk_name(self) -> str:
        return self.model._meta.pk_attr

    def _base_qs(self) -> QuerySet[T]:
        return self.model.all()

    def _apply_related(
        self,
        qs: QuerySet[T],
        related: Optional[Sequence[str]] = None,
        prefetch: Optional[Sequence[str]] = None,
    ) -> QuerySet[T]:
        if related:
            qs = qs.select_related(*related)   
        if prefetch:
            qs = qs.prefetch_related(*prefetch)
        return qs

    def _apply_ordering(self, qs: QuerySet[T], order_by: Optional[Sequence[str]]) -> QuerySet[T]:
        return qs.order_by(*order_by) if order_by else qs

    def _apply_filters(self, qs: QuerySet[T], *q: Q, **filters: Any) -> QuerySet[T]:
        merged = {**self.default_filters, **filters}
        return qs.filter(*q, **merged) if (q or merged) else qs
    
    # ------- CRUD -------
    async def create(self, **data: Any) -> T:
        if "id" not in data:
            data["id"] = uuid7()
        return await self.model.create(**data)

    async def get(self, pk: Any, *, related: Optional[Sequence[str]] = None) -> Optional[T]:
        qs = self._apply_related(self._base_qs(), related)
        return await qs.get_or_none(**{self.pk_name: pk}, **self.default_filters)
    
    async def get_by(self, *q: Q, related: Optional[Sequence[str]] = None, **filters: Any) -> Optional[T]:
        qs = self._apply_related(self._base_qs(), related)
        qs = self._apply_filters(qs, *q, **filters)
        return await qs.first()
    
    async def update(self, pk: Any, **data: Any) -> Optional[T]:
        obj = await self.get(pk)
        if not obj:
            return None
        for k, v in data.items():
            setattr(obj, k, v)
        await obj.save()
        return obj

    async def delete(self, pk: Any) -> int:
        # returns the number of deleted rows
        return await self.model.filter(**{self.pk_name: pk}, **self.default_filters).delete()

    async def get_with_related(
        self,
        pk: Any,
        *,
        related: Optional[Sequence[str]] = None,
        prefetch: Optional[Sequence[str]] = None,
        values: bool = False,
        only_fields: Optional[Sequence[str]] = None,
        flatten: bool = False,
    ) -> Optional[Union[T, dict]]:
        qs = self._base_qs()
        qs = self._apply_related(qs, related=related, prefetch=prefetch)

        filters = {self.pk_name: pk, **self.default_filters}

        if not values:
            return await qs.get_or_none(**filters)

        default_fields: list[str] = [self.pk_name]
        if related:
            for rel in related:
                default_fields.append(f"{rel}__id")  

        fields = list(only_fields) if only_fields else default_fields

        rows = await qs.filter(**filters).values(*fields)
        row = rows[0] if rows else None
        if row is None:
            return None

        return self._flatten_dict(row) if flatten else row


    # ------- reads -------
    async def first(self, *q: Q, related: Optional[Sequence[str]] = None, **filters: Any) -> Optional[T]:
        qs = self._apply_related(self._base_qs(), related)
        qs = self._apply_filters(qs, *q, **filters)
        return await qs.first()

    async def list(
        self,
        *q: Q,
        related: Optional[Sequence[str]] = None,
        order_by: Optional[Sequence[str]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **filters: Any,
    ) -> List[T]:
        qs = self._apply_related(self._base_qs(), related)
        qs = self._apply_filters(qs, *q, **filters)
        qs = self._apply_ordering(qs, order_by)
        if offset:
            qs = qs.offset(offset)
        if limit:
            qs = qs.limit(limit)
        return await qs

    async def list_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        *q: Q,
        related: Optional[Sequence[str]] = None,
        order_by: Optional[Sequence[str]] = None,
        **filters: Any,
    ) -> PageResult[T]:
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 1

        qs = self._apply_related(self._base_qs(), related)
        qs = self._apply_filters(qs, *q, **filters)
        qs = self._apply_ordering(qs, order_by)

        total = await qs.count()
        offset = (page - 1) * page_size
        items = await qs.offset(offset).limit(page_size)
        pages = (total + page_size - 1) // page_size

        return PageResult(items=items, total=total, page=page, page_size=page_size, pages=pages)

    async def count(self, *q: Q, **filters: Any) -> int:
        qs = self._apply_filters(self._base_qs(), *q, **filters)
        return await qs.count()

    async def exists(self, *q: Q, **filters: Any) -> bool:
        return await self.count(*q, **filters) > 0

    # ------- M2M utilities -------
    async def add_m2m(self, instance: T, relation: str, targets: Iterable[Model]) -> None:
        manager = getattr(instance, relation)
        await manager.add(*targets)

    async def remove_m2m(self, instance: T, relation: str, targets: Iterable[Model]) -> None:
        manager = getattr(instance, relation)
        await manager.remove(*targets)
        
 

    # ---------- Utils ----------
    @staticmethod
    def _flatten_dict(d: dict[str, Any]) -> dict[str, Any]:
        """
        Converts {"tenant__id": "...", "tenant__name": "..."} into
        {"tenant": {"id": "...", "name": "..."}}.
        """
        out: dict[str, Any] = {}
        for k, v in d.items():
            if "__" in k:
                head, tail = k.split("__", 1)
                out.setdefault(head, {})
                # nested
                tmp = out[head]
                parts = tail.split("__")
                for i, p in enumerate(parts):
                    if i == len(parts) - 1:
                        tmp[p] = v
                    else:
                        tmp = tmp.setdefault(p, {})
            else:
                out[k] = v
        return out