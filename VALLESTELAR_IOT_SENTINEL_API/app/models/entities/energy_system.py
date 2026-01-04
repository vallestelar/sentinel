from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class EnergySystem(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="energy_systems", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="energy_systems", on_delete=fields.CASCADE)

    name = fields.CharField(max_length=150, default="Sistema Energía")
    battery_capacity_ah = fields.FloatField(null=True)

    sensor_battery_voltage = fields.ForeignKeyField(
        "models.Sensor", related_name="energy_battery_voltage", null=True, on_delete=fields.SET_NULL
    )
    sensor_solar_power = fields.ForeignKeyField(
        "models.Sensor", related_name="energy_solar_power", null=True, on_delete=fields.SET_NULL
    )

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "energy_systems"
        unique_together = (("site_id", "name"),)
        indexes = (("tenant_id",), ("site_id",))
