from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Tenant(Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=150)
    rut = fields.CharField(max_length=30, null=True)
    plan = fields.CharField(max_length=30, default="agua")  # agua|terreno|total|enterprise
    status = fields.CharField(max_length=30, default="active")  # active|suspended
    metadata = fields.JSONField(default=dict)

    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "tenants"
        indexes = (("name",),)
