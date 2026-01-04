# app/core/auth.py
from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.repositories.user_repository import get_user_by_id, user_has_membership
from app.services.auth_service import AuthService

bearer_scheme = HTTPBearer(auto_error=False)


def require_access_token() -> Callable:
    async def _dependency(
        request: Request,
        creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    ) -> None:
        if creds is None or creds.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Falta token Bearer",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload: Dict[str, Any] = AuthService.decode_token(creds.credentials)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tipo de token no válido",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("sub")
        tenant_in_token = payload.get("tenant")
        if not user_id or not tenant_in_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token incompleto",
                headers={"WWW-Authenticate": "Bearer"},
            )

        tenant_header = request.headers.get("X-Tenant")
        if tenant_header and tenant_header != tenant_in_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant no coincide con el token",
            )

        user = await get_user_by_id(str(user_id))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no válido",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if hasattr(user, "is_active") and not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

        if not await user_has_membership(user_id=str(user.id), tenant=str(tenant_in_token)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario no pertenece a este tenant",
            )

        request.state.user_id = str(user.id)
        request.state.tenant = str(tenant_in_token)
        request.state.token_payload = payload
        request.state.user = user

    return _dependency
