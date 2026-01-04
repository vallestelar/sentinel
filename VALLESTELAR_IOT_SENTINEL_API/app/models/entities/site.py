from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Site(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="sites", on_delete=fields.CASCADE)

    name = fields.CharField(max_length=150)
    address_text = fields.CharField(max_length=255, null=True)
    timezone = fields.CharField(max_length=64, default="America/Santiago")
    lat = fields.FloatField(null=True)
    lng = fields.FloatField(null=True)
    metadata = fields.JSONField(default=dict)

    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "sites"
        unique_together = (("tenant_id", "name"),)
        indexes = (("tenant_id",),)
