from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class Command(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="commands", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="commands", on_delete=fields.CASCADE)
    actuator = fields.ForeignKeyField("models.Actuator", related_name="commands", on_delete=fields.CASCADE)

    command_type = fields.CharField(max_length=30)  # set_state|pulse|open|close
    payload = fields.JSONField(default=dict)

    status = fields.CharField(max_length=30, default="queued")  # queued|sent|acked|failed
    requested_by = fields.ForeignKeyField("models.User", related_name="commands", null=True, on_delete=fields.SET_NULL)

    sent_at = fields.DatetimeField(null=True)
    acked_at = fields.DatetimeField(null=True)

    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "commands"
        indexes = (("tenant_id",), ("site_id",), ("actuator_id",), ("status",), ("created_at",))
