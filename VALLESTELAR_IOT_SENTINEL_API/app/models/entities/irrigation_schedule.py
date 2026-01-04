from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class IrrigationSchedule(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="irrigation_schedules", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="irrigation_schedules", on_delete=fields.CASCADE)
    zone = fields.ForeignKeyField("models.IrrigationZone", related_name="schedules", on_delete=fields.CASCADE)

    cron = fields.CharField(max_length=120)  # o RRULE
    duration_seconds = fields.IntField(default=600)
    is_enabled = fields.BooleanField(default=True)

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "irrigation_schedules"
        indexes = (("tenant_id",), ("site_id",), ("zone_id",))
