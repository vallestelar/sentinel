# app/schemas/user_onboard_schema.py
from __future__ import annotations

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class UserOnboardCreate(BaseModel):
    tenant_id: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)

    full_name: Optional[str] = Field(None, min_length=1, max_length=150)
    status: str = Field(default="active", min_length=1, max_length=30)
    user_metadata: Optional[Dict[str, Any]] = None

    role: str = Field(default="user", min_length=1, max_length=50)
    membership_metadata: Optional[Dict[str, Any]] = None

