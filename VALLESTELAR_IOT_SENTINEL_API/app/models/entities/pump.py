from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Pump(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="pumps", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="pumps", on_delete=fields.CASCADE)

    name = fields.CharField(max_length=150)
    actuator = fields.ForeignKeyField("models.Actuator", related_name="pumps", null=True, on_delete=fields.SET_NULL)

    mode = fields.CharField(max_length=20, default="manual")  # manual|auto
    metadata = fields.JSONField(default=dict)

    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "pumps"
        unique_together = (("site_id", "name"),)
        indexes = (("tenant_id",), ("site_id",))
