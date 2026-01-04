"""
HR Routes Package - حزمة مسارات الموارد البشرية
"""

from fastapi import APIRouter

# Main HR router
hr_router = APIRouter(prefix="/hr", tags=["HR"])

# Import sub-routers when ready
# from .employees import router as employees_router
# from .attendance import router as attendance_router
# from .payroll import router as payroll_router
# from .leaves import router as leaves_router
# from .letters import router as letters_router

# Include sub-routers
# hr_router.include_router(employees_router)
# hr_router.include_router(attendance_router)
# hr_router.include_router(payroll_router)
# hr_router.include_router(leaves_router)
# hr_router.include_router(letters_router)
