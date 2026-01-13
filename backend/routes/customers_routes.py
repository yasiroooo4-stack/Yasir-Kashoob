"""
Customer Routes - مسارات العملاء
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from database import db
from models.all_models import Customer, CustomerCreate
from routes.base import get_current_user, require_role, log_activity

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    """Create a new customer"""
    customer = Customer(**customer_data.model_dump())
    await db.customers.insert_one(customer.model_dump())
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="create_customer",
        entity_type="customer",
        entity_id=customer.id,
        entity_name=customer.name,
        details=f"إضافة عميل: {customer.name}"
    )
    
    return customer


@router.get("", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    """Get all active customers"""
    customers = await db.customers.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return customers


@router.get("/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific customer by ID"""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    """Update a customer"""
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": customer_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="update_customer",
        entity_type="customer",
        entity_id=customer_id,
        entity_name=customer.get("name"),
        details=f"تعديل بيانات عميل: {customer.get('name')}"
    )
    
    return customer


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Delete a customer (soft delete - admin only)"""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": {"is_active": False}}
    )
    
    await log_activity(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        action="delete_customer",
        entity_type="customer",
        entity_id=customer_id,
        entity_name=customer.get("name"),
        details=f"حذف عميل: {customer.get('name')}"
    )
    
    return {"message": "Customer deleted successfully"}
