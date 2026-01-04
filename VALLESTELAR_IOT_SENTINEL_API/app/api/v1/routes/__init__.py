from .login_router import router as login_router
from .tenant_router import router as tenant_router
from .site_router import router as site_router
from .user_router import router as user_router
from .user_membership_router import router as user_membership_router

from .device_router import router as device_router
from .sensor_router import router as sensor_router
from .actuator_router import router as actuator_router

from .tank_router import router as tank_router
from .pump_router import router as pump_router

from .irrigation_zone_router import router as irrigation_zone_router
from .irrigation_schedule_router import router as irrigation_schedule_router
from .rule_router import router as rule_router

from .command_router import router as command_router
from .event_router import router as event_router

from .sensor_reading_router import router as sensor_reading_router
from .daily_metric_router import router as daily_metric_router

from .security_mode_router import router as security_mode_router
from .energy_system_router import router as energy_system_router



all_routers = [
    login_router,
    tenant_router,
    site_router,
    user_router,
    user_membership_router,

    sensor_router,
    device_router,
    actuator_router,

    tank_router,
    pump_router,

    irrigation_zone_router,
    irrigation_schedule_router,
    rule_router,

    command_router,
    event_router,

    sensor_reading_router,
    daily_metric_router,

    security_mode_router,
    energy_system_router,
]
