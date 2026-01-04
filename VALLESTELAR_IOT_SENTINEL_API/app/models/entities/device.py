from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Device(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="devices", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="devices", on_delete=fields.CASCADE)

    name = fields.CharField(max_length=150)
    device_type = fields.CharField(max_length=50, default="esp32")  # esp32|gateway|energy_monitor|camera_hub
    serial = fields.CharField(max_length=120, unique=True)
    fw_version = fields.CharField(max_length=50, null=True)
    status = fields.CharField(max_length=30, default="offline")  # online|offline
    last_seen_at = fields.DatetimeField(null=True)

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "devices"
        unique_together = (("tenant_id", "site_id", "name"),)
        indexes = (("tenant_id",), ("site_id",), ("serial",))
