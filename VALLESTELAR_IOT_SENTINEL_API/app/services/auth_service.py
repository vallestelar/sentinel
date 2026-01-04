from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.security.jwt import encode_jwt, decode_jwt


class AuthService:

    @staticmethod
    def create_access_token(
        *,
        subject: str,
        tenant: str,
        extra_claims: Optional[Dict[str, Any]] = None,
        expires_minutes: Optional[int] = None,
    ) -> str:
        now = datetime.now(timezone.utc)
        expire = now + timedelta(
            minutes=expires_minutes or settings.access_token_expire_minutes
        )

        payload: Dict[str, Any] = {
            "sub": subject,
            "tenant": tenant,
            "type": "access",
            "iat": int(now.timestamp()),
            "exp": int(expire.timestamp()),
        }

        if extra_claims:
            payload.update(extra_claims)

        return encode_jwt(
            payload,
            settings.jwt_secret,
            settings.jwt_algorithm,
        )

    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        return decode_jwt(
            token,
            settings.jwt_secret,
            [settings.jwt_algorithm],
        )
