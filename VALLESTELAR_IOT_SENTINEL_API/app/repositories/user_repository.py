from typing import Optional
from uuid import UUID

from app.models.entities import User, UserMembership


async def get_user_by_email(email: str) -> Optional[User]:
    return await User.get_or_none(email=email)


async def get_user_by_id(user_id: str) -> Optional[User]:
    try:
        return await User.get_or_none(id=UUID(user_id))
    except Exception:
        return await User.get_or_none(id=user_id)


# ✅ CORREGIDO: tenant_id explícito
async def user_has_membership(user_id: str, tenant_id: str) -> bool:
    membership = await UserMembership.get_or_none(
        user_id=user_id,
        tenant_id=tenant_id,
    )
    return membership is not None

