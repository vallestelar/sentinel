from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Sensor(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="sensors", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="sensors", on_delete=fields.CASCADE)
    device = fields.ForeignKeyField("models.Device", related_name="sensors", on_delete=fields.CASCADE)

    name = fields.CharField(max_length=150)
    sensor_type = fields.CharField(max_length=50)  # tank_level|pressure|flow|soil_moisture|motion|door|battery_voltage|solar_power
    unit = fields.CharField(max_length=20, null=True)  # %, L, bar, V, W...
    calibration_json = fields.JSONField(default=dict)
    is_enabled = fields.BooleanField(default=True)

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "sensors"
        unique_together = (("device_id", "name"),)
        indexes = (("tenant_id",), ("site_id",), ("device_id",), ("sensor_type",))
