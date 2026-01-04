from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Actuator(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="actuators", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="actuators", on_delete=fields.CASCADE)
    device = fields.ForeignKeyField("models.Device", related_name="actuators", on_delete=fields.CASCADE)

    name = fields.CharField(max_length=150)
    actuator_type = fields.CharField(max_length=50)  # valve|relay|gate|siren|pump
    channel = fields.CharField(max_length=50, null=True)  # GPIO, relay-1, etc.
    state = fields.JSONField(default=dict)
    is_enabled = fields.BooleanField(default=True)

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "actuators"
        unique_together = (("device_id", "name"),)
        indexes = (("tenant_id",), ("site_id",), ("device_id",), ("actuator_type",))
