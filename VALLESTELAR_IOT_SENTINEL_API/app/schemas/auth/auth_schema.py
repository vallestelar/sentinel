# app/auth/schemas.py
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class LoginRequest(BaseModel):
    tenant_id: UUID
    email: EmailStr
    password: str = Field(..., min_length=1)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
