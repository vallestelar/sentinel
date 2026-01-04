from __future__ import annotations
from typing import Any, Dict, Optional, Type, TypeVar
from tortoise.models import Model

from app.services.generic_service import GenericService

T = TypeVar("T", bound=Model)

class ServiceFactory:
    """
    Creates and caches GenericService[T] by model.
    Allows for per-model overrides with a specific service subclass.
    """
    def __init__(self):
        self._cache: Dict[Type[Model], GenericService] = {}
        self._overrides: Dict[Type[Model], Type[GenericService]] = {}

    def register_override(self, model: Type[T], service_cls: Type[GenericService[T]]) -> None:
        """Registers a specific implementation for a model."""
        self._overrides[model] = service_cls
        # if it was already in cache, we invalidate it
        self._cache.pop(model, None)

    def get(self, model: Type[T], *, default_filters: Optional[dict[str, Any]] = None) -> GenericService[T]:
        """
        Obtains (or creates) a service for the given model.
        Applies default_filters (e.g., tenant_id, is_deleted=False, etc.).
        """
        svc = self._cache.get(model)
        if svc is None:
            svc_cls = self._overrides.get(model, GenericService)
            svc = svc_cls(model, default_filters=default_filters)  # type: ignore[arg-type]
            self._cache[model] = svc
        else:
            # if you need the default_filters to be per-request, create a new instance:
            if default_filters:
                svc = type(svc)(model, default_filters=default_filters)  # ad-hoc instance
        return svc  # type: ignore[return-value]


# ---- global instance (optional) ----
service_factory = ServiceFactory()
