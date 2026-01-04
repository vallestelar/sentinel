from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class SecurityMode(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="security_modes", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="security_modes", on_delete=fields.CASCADE)

    mode = fields.CharField(max_length=20, default="home")  # home|away|night
    is_armed = fields.BooleanField(default=False)

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "security_modes"
        unique_together = (("site_id",),)
        indexes = (("tenant_id",), ("site_id",))
