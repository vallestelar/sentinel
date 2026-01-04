# app/core/security/jwt.py
from typing import Any, Dict, Iterable

from jose import JWTError, jwt


def encode_jwt(payload: Dict[str, Any], secret: str, algorithm: str) -> str:
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_jwt(token: str, secret: str, algorithms: Iterable[str]) -> Dict[str, Any]:
    try:
        return jwt.decode(token, secret, algorithms=list(algorithms))
    except JWTError as e:
        raise ValueError("Token inválido o expirado") from e
