from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Tank(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="tanks", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="tanks", on_delete=fields.CASCADE)

    name = fields.CharField(max_length=150)
    capacity_liters = fields.IntField()
    shape = fields.CharField(max_length=30, default="vertical")  # vertical|horizontal
    height_cm = fields.FloatField(null=True)

    min_level_pct_alert = fields.IntField(default=25)
    critical_level_pct_alert = fields.IntField(default=10)

    sensor_level = fields.ForeignKeyField("models.Sensor", related_name="tanks_level", null=True, on_delete=fields.SET_NULL)
    sensor_pressure = fields.ForeignKeyField("models.Sensor", related_name="tanks_pressure", null=True, on_delete=fields.SET_NULL)

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "tanks"
        unique_together = (("site_id", "name"),)
        indexes = (("tenant_id",), ("site_id",))
