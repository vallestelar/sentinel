from __future__ import annotations
from tortoise import fields
from tortoise.models import Model


class DailyMetric(Model):
    id = fields.UUIDField(pk=True)
    tenant = fields.ForeignKeyField("models.Tenant", related_name="daily_metrics", on_delete=fields.CASCADE)
    site = fields.ForeignKeyField("models.Site", related_name="daily_metrics", on_delete=fields.CASCADE)

    metric_date = fields.DateField()
    metric_key = fields.CharField(max_length=120)  # tank1_consumption_liters, irrigation_minutes_zone1...
    value = fields.FloatField()
    meta = fields.JSONField(default=dict)

    created_at = fields.DatetimeField(auto_now_add=True)
    created_by = fields.CharField(max_length=100, default="system")
    updated_at = fields.DatetimeField(auto_now=True)
    updated_by = fields.CharField(max_length=100, default="system")

    class Meta:
        table = "daily_metrics"
        unique_together = (("site_id", "metric_date", "metric_key"),)
        indexes = (("tenant_id", "metric_date"), ("site_id", "metric_date"), ("metric_key",))
