from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class UserMembership(Model):
    id = fields.UUIDField(pk=True)
    user = fields.ForeignKeyField("models.User", related_name="memberships", on_delete=fields.CASCADE)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="memberships", on_delete=fields.CASCADE)

    role = fields.CharField(max_length=30, default="member")  # owner|admin|member|installer|support
    metadata = fields.JSONField(default=dict)

    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "user_memberships"
        unique_together = (("user_id", "tenant_id"),)
        indexes = (("tenant_id",), ("user_id",))
