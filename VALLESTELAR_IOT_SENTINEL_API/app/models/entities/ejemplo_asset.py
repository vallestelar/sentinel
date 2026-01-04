
from __future__ import annotations
from tortoise import fields
from tortoise.models import Model

class Asset(Model):
    id = fields.UUIDField(pk=True)
    description = fields.CharField(max_length=255, null=True)
    area = fields.ForeignKeyField("models.Area", related_name="assets", null=True, on_delete=fields.SET_NULL)
    asset_type = fields.ForeignKeyField("models.AssetType", related_name="assets", null=True)
    code = fields.CharField(max_length=100)
    name = fields.CharField(max_length=100)
    parent = fields.ForeignKeyField("models.Asset", related_name="children", null=True)
    manufacturer = fields.CharField(max_length=100, null=True)
    model = fields.CharField(max_length=100, null=True)
    serial_number = fields.CharField(max_length=100, null=True)
    install_date = fields.DateField(null=True)
    criticality = fields.IntField(null=True)
    metadata = fields.JSONField(default=dict)
    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "assets"
        unique_together = (("area_id", "code"),)
