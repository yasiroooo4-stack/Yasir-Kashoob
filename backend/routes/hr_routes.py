"""
HR Routes - مسارات الموارد البشرية
تشمل: الموظفين، الحضور، الإجازات، المصاريف، إلخ
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api", tags=["HR"])

# ملاحظة: هذا الملف جاهز لاستقبال routes من server.py
# سيتم نقل الـ routes تدريجياً
