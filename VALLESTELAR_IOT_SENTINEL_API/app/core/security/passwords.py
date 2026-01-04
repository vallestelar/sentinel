# app/core/security/passwords.py
import hashlib
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _normalize_password(password: str) -> str:
    """
    bcrypt admite hasta 72 bytes. Si supera, pre-hasheamos con SHA-256
    para mantener compatibilidad y evitar ValueError.
    """
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) <= 72:
        return password

    digest = hashlib.sha256(pw_bytes).hexdigest()
    # Añadimos prefijo para distinguir el caso (opcional pero útil)
    return f"sha256:{digest}"


def hash_password(password: str) -> str:
    normalized = _normalize_password(password)
    return pwd_context.hash(normalized)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    normalized = _normalize_password(plain_password)
    return pwd_context.verify(normalized, hashed_password)
