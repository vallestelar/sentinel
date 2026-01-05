# app/api/v1/login_router.py
from fastapi import APIRouter, HTTPException, status

from app.schemas.auth.auth_schema import LoginRequest, TokenResponse
from app.core.security.passwords import verify_password
from app.services.auth_service import AuthService
from app.repositories.user_repository import get_user_by_email, user_has_membership




router = APIRouter(prefix="/api/v1/login", tags=["Auth"])
@router.post("/token", response_model=TokenResponse)
async def login(data: LoginRequest) -> TokenResponse:
    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = await get_user_by_email(data.email)
    if not user:
        raise invalid_exc

    # Opcional: usuario activo
    # (en su modelo usa status, así que esto casi nunca aplicará; lo dejo por compatibilidad)
    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

    # ✅ su modelo guarda password_hash
    if not verify_password(data.password, user.password_hash):
        raise invalid_exc

    # ✅ multi-tenant: su campo real es tenant_id
    if not await user_has_membership(user_id=str(user.id), tenant_id=str(data.tenant_id)):
        raise invalid_exc

    # ✅ el token debe llevar tenant_id (lo guardamos en el claim "tenant")
    access_token = AuthService.create_access_token(
        subject=str(user.id),
        tenant=str(data.tenant_id),
        extra_claims={
            "role": "user",
        },
    )

    return TokenResponse(access_token=access_token)
