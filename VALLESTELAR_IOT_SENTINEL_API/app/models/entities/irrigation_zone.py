from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class IrrigationZone(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="irrigation_zones", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="irrigation_zones", on_delete=fields.CASCADE)

    name = fields.CharField(max_length=150)

    actuator = fields.ForeignKeyField("models.Actuator", related_name="irrigation_zones", null=True, on_delete=fields.SET_NULL)
    sensor_moisture = fields.ForeignKeyField("models.Sensor", related_name="irrigation_zones_moisture", null=True, on_delete=fields.SET_NULL)
    sensor_flow = fields.ForeignKeyField("models.Sensor", related_name="irrigation_zones_flow", null=True, on_delete=fields.SET_NULL)

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "irrigation_zones"
        unique_together = (("site_id", "name"),)
        indexes = (("tenant_id",), ("site_id",))
