"""
Tasks Management Routes - مسارات إدارة المهام
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone
from models.all_models import Task, TaskCreate, TaskResponse, TaskNotification
import os
import uuid

# Database connection
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "milk_erp")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# Helper function to get current user (imported from server.py)
from server import get_current_user

async def create_task_notification(
    task_id: str,
    user_id: str,
    notification_type: str,
    title: str,
    message: str
):
    """إنشاء إشعار للمهمة"""
    notification = TaskNotification(
        task_id=task_id,
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message
    )
    await db.task_notifications.insert_one(notification.model_dump())
    return notification


@router.get("")
async def get_tasks(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    assigned_by: Optional[str] = None,
    priority: Optional[str] = None,
    department: Optional[str] = None,
    center_id: Optional[str] = None,
    is_delayed: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على قائمة المهام"""
    query = {}
    
    # فلترة حسب الحالة
    if status:
        query["status"] = status
    
    # فلترة حسب الموظف المكلف
    if assigned_to:
        query["assigned_to_id"] = assigned_to
    
    # فلترة حسب المسؤول
    if assigned_by:
        query["assigned_by_id"] = assigned_by
    
    # فلترة حسب الأولوية
    if priority:
        query["priority"] = priority
    
    # فلترة حسب القسم
    if department:
        query["department"] = department
    
    # فلترة حسب المركز
    if center_id:
        query["center_id"] = center_id
    
    # فلترة المهام المتأخرة
    if is_delayed is not None:
        query["is_delayed"] = is_delayed
    
    # فلترة حسب التاريخ
    if start_date:
        query.setdefault("due_date", {})["$gte"] = start_date
    if end_date:
        query.setdefault("due_date", {})["$lte"] = end_date
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # تحديث حالة التأخير
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for task in tasks:
        if task.get("status") not in ["completed", "cancelled"] and task.get("due_date"):
            if task["due_date"] < today:
                task["is_delayed"] = True
                from dateutil import parser
                due = parser.parse(task["due_date"])
                today_date = parser.parse(today)
                task["delay_days"] = (today_date - due).days
    
    return tasks


@router.get("/my-tasks")
async def get_my_tasks(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على مهامي (المكلف بها)"""
    query = {"assigned_to_id": current_user.get("employee_id") or current_user["id"]}
    
    if status:
        query["status"] = status
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tasks


@router.get("/assigned-by-me")
async def get_tasks_assigned_by_me(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على المهام التي أنشأتها"""
    query = {"assigned_by_id": current_user["id"]}
    
    if status:
        query["status"] = status
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tasks


@router.get("/notifications")
async def get_my_notifications(
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على إشعاراتي"""
    query = {"user_id": current_user["id"]}
    
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.task_notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return notifications


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """تحديد الإشعار كمقروء"""
    result = await db.task_notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {
            "is_read": True,
            "read_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="الإشعار غير موجود")
    
    return {"message": "تم تحديد الإشعار كمقروء"}


@router.get("/stats")
async def get_tasks_stats(
    current_user: dict = Depends(get_current_user)
):
    """إحصائيات المهام"""
    user_id = current_user.get("employee_id") or current_user["id"]
    
    # مهامي
    my_total = await db.tasks.count_documents({"assigned_to_id": user_id})
    my_pending = await db.tasks.count_documents({"assigned_to_id": user_id, "status": "pending"})
    my_in_progress = await db.tasks.count_documents({"assigned_to_id": user_id, "status": "in_progress"})
    my_completed = await db.tasks.count_documents({"assigned_to_id": user_id, "status": "completed"})
    my_delayed = await db.tasks.count_documents({"assigned_to_id": user_id, "is_delayed": True, "status": {"$nin": ["completed", "cancelled"]}})
    
    # المهام التي أنشأتها
    assigned_total = await db.tasks.count_documents({"assigned_by_id": current_user["id"]})
    assigned_pending = await db.tasks.count_documents({"assigned_by_id": current_user["id"], "status": "pending"})
    assigned_completed = await db.tasks.count_documents({"assigned_by_id": current_user["id"], "status": "completed"})
    
    # الإشعارات غير المقروءة
    unread_notifications = await db.task_notifications.count_documents({
        "user_id": current_user["id"],
        "is_read": False
    })
    
    return {
        "my_tasks": {
            "total": my_total,
            "pending": my_pending,
            "in_progress": my_in_progress,
            "completed": my_completed,
            "delayed": my_delayed
        },
        "assigned_tasks": {
            "total": assigned_total,
            "pending": assigned_pending,
            "completed": assigned_completed
        },
        "unread_notifications": unread_notifications
    }


@router.get("/{task_id}")
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """الحصول على تفاصيل مهمة"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    # الحصول على الردود
    responses = await db.task_responses.find(
        {"task_id": task_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    task["responses"] = responses
    
    return task


@router.post("")
async def create_task(
    data: TaskCreate,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء مهمة جديدة"""
    # التحقق من صلاحية إنشاء المهام
    user_permissions = current_user.get("permissions", [])
    if not any(p in user_permissions for p in ["tasks_create", "tasks_assign", "tasks_manage"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية إنشاء مهام")
    
    # إنشاء رقم المهمة
    task_count = await db.tasks.count_documents({})
    task_number = f"TSK-{datetime.now().strftime('%Y%m')}-{str(task_count + 1).zfill(4)}"
    
    task = Task(
        **data.model_dump(),
        task_number=task_number
    )
    
    await db.tasks.insert_one(task.model_dump())
    
    # إنشاء إشعار للموظف المكلف
    await create_task_notification(
        task_id=task.id,
        user_id=data.assigned_to_id,
        notification_type="new_task",
        title="مهمة جديدة",
        message=f"تم تكليفك بمهمة جديدة: {data.title} - يجب إنجازها قبل {data.due_date}"
    )
    
    return task.model_dump()


@router.put("/{task_id}")
async def update_task(
    task_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تحديث مهمة"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    # التحقق من الصلاحية (المسؤول أو الموظف المكلف)
    user_id = current_user.get("employee_id") or current_user["id"]
    is_assignee = task["assigned_to_id"] == user_id
    is_assigner = task["assigned_by_id"] == current_user["id"]
    is_admin = current_user.get("role") == "admin"
    has_manage = "tasks_manage" in current_user.get("permissions", [])
    
    if not (is_assignee or is_assigner or is_admin or has_manage):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية تعديل هذه المهمة")
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # إذا تم تغيير الحالة إلى "قيد التنفيذ"
    if data.get("status") == "in_progress" and task.get("status") == "pending":
        data["started_at"] = datetime.now(timezone.utc).isoformat()
    
    # إذا تم تغيير الحالة إلى "مكتملة"
    if data.get("status") == "completed" and task.get("status") != "completed":
        data["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # التحقق من التأخير
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if task.get("due_date") and task["due_date"] < today:
            data["is_delayed"] = True
            from dateutil import parser
            due = parser.parse(task["due_date"])
            completed = parser.parse(today)
            data["delay_days"] = (completed - due).days
        else:
            data["is_delayed"] = False
            data["delay_days"] = 0
        
        # إشعار للمسؤول بإنجاز المهمة
        await create_task_notification(
            task_id=task_id,
            user_id=task["assigned_by_id"],
            notification_type="task_completed",
            title="تم إنجاز مهمة",
            message=f"تم إنجاز المهمة: {task['title']} بواسطة {task['assigned_to_name']}"
        )
    
    result = await db.tasks.update_one(
        {"id": task_id},
        {"$set": data}
    )
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated_task


@router.post("/{task_id}/respond")
async def respond_to_task(
    task_id: str,
    message: str,
    attachment_url: Optional[str] = None,
    attachment_name: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """الرد على مهمة"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    response = TaskResponse(
        task_id=task_id,
        responder_id=current_user["id"],
        responder_name=current_user.get("full_name", ""),
        message=message,
        attachment_url=attachment_url,
        attachment_name=attachment_name
    )
    
    await db.task_responses.insert_one(response.model_dump())
    
    # إشعار الطرف الآخر
    notify_user = task["assigned_by_id"] if current_user["id"] != task["assigned_by_id"] else task["assigned_to_id"]
    
    await create_task_notification(
        task_id=task_id,
        user_id=notify_user,
        notification_type="task_response",
        title="رد جديد على مهمة",
        message=f"رد جديد على المهمة: {task['title']} من {current_user.get('full_name', '')}"
    )
    
    return response.model_dump()


@router.post("/{task_id}/complete")
async def complete_task(
    task_id: str,
    completion_notes: Optional[str] = None,
    attachment_url: Optional[str] = None,
    attachment_name: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """إنجاز مهمة"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    user_id = current_user.get("employee_id") or current_user["id"]
    if task["assigned_to_id"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="فقط الموظف المكلف يمكنه إنجاز المهمة")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    is_delayed = False
    delay_days = 0
    
    if task.get("due_date") and task["due_date"] < today:
        is_delayed = True
        from dateutil import parser
        due = parser.parse(task["due_date"])
        completed = parser.parse(today)
        delay_days = (completed - due).days
    
    update_data = {
        "status": "completed",
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_delayed": is_delayed,
        "delay_days": delay_days,
        "completion_notes": completion_notes,
        "attachment_url": attachment_url,
        "attachment_name": attachment_name
    }
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    # إشعار للمسؤول
    await create_task_notification(
        task_id=task_id,
        user_id=task["assigned_by_id"],
        notification_type="task_completed",
        title="تم إنجاز مهمة",
        message=f"تم إنجاز المهمة: {task['title']} {'(متأخرة بـ ' + str(delay_days) + ' يوم)' if is_delayed else '(في الوقت المحدد)'}"
    )
    
    return {"message": "تم إنجاز المهمة بنجاح", "is_delayed": is_delayed, "delay_days": delay_days}


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """حذف مهمة"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    # فقط المسؤول أو من أنشأ المهمة يمكنه حذفها
    if task["assigned_by_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية حذف هذه المهمة")
    
    await db.tasks.delete_one({"id": task_id})
    await db.task_responses.delete_many({"task_id": task_id})
    await db.task_notifications.delete_many({"task_id": task_id})
    
    return {"message": "تم حذف المهمة بنجاح"}


@router.get("/reports/summary")
async def get_tasks_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    center_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """تقرير ملخص المهام"""
    query = {}
    
    if start_date:
        query.setdefault("created_at", {})["$gte"] = start_date
    if end_date:
        query.setdefault("created_at", {})["$lte"] = end_date + "T23:59:59"
    if department:
        query["department"] = department
    if center_id:
        query["center_id"] = center_id
    
    total = await db.tasks.count_documents(query)
    
    completed_query = {**query, "status": "completed"}
    completed = await db.tasks.count_documents(completed_query)
    
    pending_query = {**query, "status": "pending"}
    pending = await db.tasks.count_documents(pending_query)
    
    in_progress_query = {**query, "status": "in_progress"}
    in_progress = await db.tasks.count_documents(in_progress_query)
    
    delayed_query = {**query, "is_delayed": True}
    delayed = await db.tasks.count_documents(delayed_query)
    
    on_time_query = {**query, "status": "completed", "is_delayed": False}
    on_time = await db.tasks.count_documents(on_time_query)
    
    # نسبة الإنجاز في الوقت المحدد
    completion_rate = (on_time / completed * 100) if completed > 0 else 0
    
    # الحصول على أكثر الموظفين إنجازاً
    pipeline = [
        {"$match": {**query, "status": "completed"}},
        {"$group": {
            "_id": {"id": "$assigned_to_id", "name": "$assigned_to_name"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    top_performers = []
    async for doc in db.tasks.aggregate(pipeline):
        top_performers.append({
            "employee_id": doc["_id"]["id"],
            "employee_name": doc["_id"]["name"],
            "completed_tasks": doc["count"]
        })
    
    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "in_progress": in_progress,
        "delayed": delayed,
        "on_time": on_time,
        "completion_rate": round(completion_rate, 1),
        "top_performers": top_performers
    }
