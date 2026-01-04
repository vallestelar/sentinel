from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Event(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="events", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="events", on_delete=fields.CASCADE)

    event_type = fields.CharField(max_length=50)  # tank_low|motion_detected|battery_low...
    severity = fields.CharField(max_length=15, default="info")  # info|warning|critical

    source_type = fields.CharField(max_length=20, null=True)  # sensor|actuator|system
    source_id = fields.UUIDField(null=True)

    ts = fields.DatetimeField()
    title = fields.CharField(max_length=200)
    description = fields.TextField(null=True)

    ack_status = fields.CharField(max_length=20, default="new")  # new|ack|closed
    ack_by = fields.ForeignKeyField("models.User", related_name="acked_events", null=True, on_delete=fields.SET_NULL)
    ack_at = fields.DatetimeField(null=True)

    meta = fields.JSONField(default=dict)

    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "events"
        indexes = (("tenant_id",), ("site_id",), ("ts",), ("event_type",), ("severity",), ("ack_status",))
