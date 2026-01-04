from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Rule(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="rules", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="rules", on_delete=fields.CASCADE)

    name = fields.CharField(max_length=150)
    area = fields.CharField(max_length=30)  # agua|riego|seguridad|energia

    condition_json = fields.JSONField(default=dict)
    action_json = fields.JSONField(default=dict)

    is_enabled = fields.BooleanField(default=True)

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "rules"
        unique_together = (("site_id", "name"),)
        indexes = (("tenant_id",), ("site_id",), ("area",))
