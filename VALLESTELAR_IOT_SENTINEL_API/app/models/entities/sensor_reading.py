from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class SensorReading(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="sensor_readings", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="sensor_readings", on_delete=fields.CASCADE)
    sensor = fields.ForeignKeyField("models.Sensor", related_name="readings", on_delete=fields.CASCADE)

    ts = fields.DatetimeField()
    value = fields.FloatField()
    quality = fields.CharField(max_length=20, default="ok")  # ok|estimated|invalid
    meta = fields.JSONField(default=dict)

    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "sensor_readings_5m"
        unique_together = (("sensor_id", "ts"),)
        indexes = (("tenant_id", "ts"), ("site_id", "ts"), ("sensor_id", "ts"))
