"""
Utils Package - حزمة الأدوات المساعدة
"""
from .helpers import (
    send_email,
    calculate_work_hours,
    SYSTEM_BACKGROUNDS,
    DEPARTMENT_PERMISSIONS,
    AVAILABLE_PERMISSIONS
)

__all__ = [
    "send_email",
    "calculate_work_hours",
    "SYSTEM_BACKGROUNDS",
    "DEPARTMENT_PERMISSIONS",
    "AVAILABLE_PERMISSIONS"
]
