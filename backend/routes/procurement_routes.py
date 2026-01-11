from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models.procurement import (
    Vendor, VendorCreate, VendorStatus,
    Requisition, RequisitionCreate, RequisitionStatus, ApprovalHistory,
    PurchaseOrder, POCreate, POStatus,
    GoodsReceipt, GoodsReceiptCreate,
    InventoryItem, InventoryItemCreate,
    VendorEvaluation
)

router = APIRouter(prefix="/api/procurement", tags=["Procurement"])

# Import database and auth from main server
from server import db, get_current_user, require_role, create_auto_journal_entry

# ==================== VENDORS ====================

@router.get("/vendors")
async def get_vendors(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all procurement vendors"""
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"name_ar": {"$regex": search, "$options": "i"}},
            {"contact_person": {"$regex": search, "$options": "i"}}
        ]
    
    vendors = await db.procurement_vendors.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return vendors

@router.post("/vendors")
async def create_vendor(vendor: VendorCreate, current_user: dict = Depends(get_current_user)):
    """Create a new vendor"""
    vendor_dict = vendor.model_dump()
    vendor_dict["id"] = str(uuid.uuid4())
    vendor_dict["status"] = VendorStatus.ACTIVE.value
    vendor_dict["total_orders"] = 0
    vendor_dict["total_amount"] = 0.0
    vendor_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    vendor_dict["created_by"] = current_user.get("id")
    
    await db.procurement_vendors.insert_one(vendor_dict)
    # Remove MongoDB _id before returning
    vendor_dict.pop("_id", None)
    return vendor_dict

@router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, vendor: VendorCreate, current_user: dict = Depends(get_current_user)):
    """Update a vendor"""
    result = await db.procurement_vendors.update_one(
        {"id": vendor_id},
        {"$set": {**vendor.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor updated"}

@router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Delete a vendor"""
    await db.procurement_vendors.delete_one({"id": vendor_id})
    return {"message": "Vendor deleted"}

# ==================== REQUISITIONS ====================

@router.get("/requisitions")
async def get_requisitions(
    status: Optional[str] = None,
    department: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all purchase requisitions"""
    query = {}
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    
    requisitions = await db.purchase_requisitions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return requisitions

@router.post("/requisitions")
async def create_requisition(req: RequisitionCreate, current_user: dict = Depends(get_current_user)):
    """Create a new purchase requisition"""
    # Generate requisition number
    count = await db.purchase_requisitions.count_documents({})
    req_number = f"PR-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
    
    # Calculate total
    total = sum(item.quantity * item.estimated_price for item in req.items)
    
    req_dict = req.model_dump()
    req_dict["id"] = str(uuid.uuid4())
    req_dict["requisition_number"] = req_number
    req_dict["status"] = RequisitionStatus.DRAFT.value
    req_dict["total_estimated"] = total
    req_dict["requested_by"] = current_user.get("id")
    req_dict["requested_by_name"] = current_user.get("full_name", current_user.get("username"))
    req_dict["approval_history"] = []
    req_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update item totals
    for item in req_dict["items"]:
        item["total_estimated"] = item["quantity"] * item["estimated_price"]
    
    await db.purchase_requisitions.insert_one(req_dict)
    req_dict.pop("_id", None)
    return req_dict

@router.put("/requisitions/{req_id}")
async def update_requisition(req_id: str, req: RequisitionCreate, current_user: dict = Depends(get_current_user)):
    """Update a requisition (only if draft)"""
    existing = await db.purchase_requisitions.find_one({"id": req_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if existing.get("status") != RequisitionStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Can only edit draft requisitions")
    
    total = sum(item.quantity * item.estimated_price for item in req.items)
    req_dict = req.model_dump()
    req_dict["total_estimated"] = total
    req_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    for item in req_dict["items"]:
        item["total_estimated"] = item["quantity"] * item["estimated_price"]
    
    await db.purchase_requisitions.update_one({"id": req_id}, {"$set": req_dict})
    return {"message": "Requisition updated"}

@router.post("/requisitions/{req_id}/submit")
async def submit_requisition(req_id: str, current_user: dict = Depends(get_current_user)):
    """Submit requisition for approval"""
    existing = await db.purchase_requisitions.find_one({"id": req_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Requisition not found")
    
    await db.purchase_requisitions.update_one(
        {"id": req_id},
        {"$set": {
            "status": RequisitionStatus.PENDING_DEPT_APPROVAL.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Requisition submitted for approval"}

@router.post("/requisitions/{req_id}/approve")
async def approve_requisition(
    req_id: str,
    comments: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Approve a requisition (moves to next approval step)"""
    existing = await db.purchase_requisitions.find_one({"id": req_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Requisition not found")
    
    current_status = existing.get("status")
    approval_entry = {
        "step": current_status,
        "approver_id": current_user.get("id"),
        "approver_name": current_user.get("full_name", current_user.get("username")),
        "action": "approved",
        "comments": comments,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Determine next status
    if current_status == RequisitionStatus.PENDING_DEPT_APPROVAL.value:
        new_status = RequisitionStatus.PENDING_FINANCE_APPROVAL.value
    elif current_status == RequisitionStatus.PENDING_FINANCE_APPROVAL.value:
        new_status = RequisitionStatus.APPROVED.value
    else:
        raise HTTPException(status_code=400, detail="Invalid status for approval")
    
    await db.purchase_requisitions.update_one(
        {"id": req_id},
        {
            "$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()},
            "$push": {"approval_history": approval_entry}
        }
    )
    return {"message": f"Requisition approved, new status: {new_status}"}

@router.post("/requisitions/{req_id}/reject")
async def reject_requisition(
    req_id: str,
    comments: str,
    current_user: dict = Depends(get_current_user)
):
    """Reject a requisition"""
    existing = await db.purchase_requisitions.find_one({"id": req_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Requisition not found")
    
    approval_entry = {
        "step": existing.get("status"),
        "approver_id": current_user.get("id"),
        "approver_name": current_user.get("full_name", current_user.get("username")),
        "action": "rejected",
        "comments": comments,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.purchase_requisitions.update_one(
        {"id": req_id},
        {
            "$set": {"status": RequisitionStatus.REJECTED.value, "updated_at": datetime.now(timezone.utc).isoformat()},
            "$push": {"approval_history": approval_entry}
        }
    )
    return {"message": "Requisition rejected"}

# ==================== PURCHASE ORDERS ====================

@router.get("/purchase-orders")
async def get_purchase_orders(
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all purchase orders"""
    query = {}
    if status:
        query["status"] = status
    if vendor_id:
        query["vendor_id"] = vendor_id
    
    pos = await db.purchase_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return pos

@router.post("/purchase-orders")
async def create_purchase_order(po: POCreate, current_user: dict = Depends(get_current_user)):
    """Create a new purchase order"""
    # Generate PO number
    count = await db.purchase_orders.count_documents({})
    po_number = f"PO-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
    
    # Calculate totals
    subtotal = sum(item.quantity * item.unit_price for item in po.items)
    
    po_dict = po.model_dump()
    po_dict["id"] = str(uuid.uuid4())
    po_dict["po_number"] = po_number
    po_dict["status"] = POStatus.DRAFT.value
    po_dict["subtotal"] = subtotal
    po_dict["tax_amount"] = subtotal * (po_dict.get("tax_rate", 0) / 100)
    po_dict["total_amount"] = subtotal + po_dict["tax_amount"]
    po_dict["amount_paid"] = 0.0
    po_dict["created_by"] = current_user.get("id")
    po_dict["created_by_name"] = current_user.get("full_name", current_user.get("username"))
    po_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update item totals
    for item in po_dict["items"]:
        item["total_price"] = item["quantity"] * item["unit_price"]
        item["quantity_received"] = 0
    
    await db.purchase_orders.insert_one(po_dict)
    
    # Update vendor stats
    await db.procurement_vendors.update_one(
        {"id": po.vendor_id},
        {"$inc": {"total_orders": 1, "total_amount": po_dict["total_amount"]}}
    )
    
    return po_dict

@router.put("/purchase-orders/{po_id}")
async def update_purchase_order(po_id: str, po: POCreate, current_user: dict = Depends(get_current_user)):
    """Update a purchase order (only if draft)"""
    existing = await db.purchase_orders.find_one({"id": po_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if existing.get("status") != POStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Can only edit draft purchase orders")
    
    subtotal = sum(item.quantity * item.unit_price for item in po.items)
    po_dict = po.model_dump()
    po_dict["subtotal"] = subtotal
    po_dict["tax_amount"] = subtotal * (po_dict.get("tax_rate", 0) / 100)
    po_dict["total_amount"] = subtotal + po_dict["tax_amount"]
    po_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    for item in po_dict["items"]:
        item["total_price"] = item["quantity"] * item["unit_price"]
    
    await db.purchase_orders.update_one({"id": po_id}, {"$set": po_dict})
    return {"message": "Purchase order updated"}

@router.post("/purchase-orders/{po_id}/send")
async def send_purchase_order(po_id: str, current_user: dict = Depends(get_current_user)):
    """Mark PO as sent to vendor"""
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {
            "status": POStatus.SENT.value,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Purchase order sent"}

@router.post("/purchase-orders/{po_id}/confirm")
async def confirm_purchase_order(po_id: str, current_user: dict = Depends(get_current_user)):
    """Confirm PO (vendor accepted)"""
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {
            "status": POStatus.CONFIRMED.value,
            "confirmed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Purchase order confirmed"}

@router.post("/purchase-orders/{po_id}/pay")
async def pay_purchase_order(
    po_id: str, 
    amount: float,
    payment_method: str = "bank_transfer",
    reference: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Record payment for a purchase order - Creates automatic journal entry"""
    po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    current_paid = po.get("amount_paid", 0)
    total_amount = po.get("total_amount", 0)
    
    if current_paid + amount > total_amount:
        raise HTTPException(status_code=400, detail="مبلغ الدفع أكبر من المبلغ المستحق")
    
    new_paid = round(current_paid + amount, 3)
    status = POStatus.COMPLETED.value if new_paid >= total_amount else po.get("status")
    
    # Record payment
    payment_record = {
        "id": str(uuid.uuid4()),
        "amount": amount,
        "payment_method": payment_method,
        "reference": reference,
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "paid_by": current_user.get("full_name", current_user.get("username"))
    }
    
    await db.purchase_orders.update_one(
        {"id": po_id},
        {
            "$set": {"amount_paid": new_paid, "status": status},
            "$push": {"payments": payment_record}
        }
    )
    
    # Create automatic journal entry
    # Dr: الموردين (2110) / Cr: البنك (1112) أو الصندوق (1111)
    credit_account = "1112" if payment_method == "bank_transfer" else "1111"
    try:
        await create_auto_journal_entry(
            description=f"سداد فاتورة شراء - {po.get('po_number', '')} - {po.get('vendor_name', '')}",
            lines=[
                {"account_number": "2110", "debit": round(amount, 3), "credit": 0, "description": f"سداد للمورد - {po.get('vendor_name', '')}"},
                {"account_number": credit_account, "debit": 0, "credit": round(amount, 3), "description": f"دفعة لأمر شراء {po.get('po_number', '')}"}
            ],
            reference_type="po_payment",
            reference_id=po_id,
            created_by_id=current_user.get("id"),
            created_by_name=current_user.get("full_name", current_user.get("username"))
        )
    except Exception as e:
        print(f"Error creating journal entry: {e}")
    
    return {
        "message": f"تم تسجيل دفعة {amount:.3f} ر.ع",
        "total_paid": new_paid,
        "remaining": round(total_amount - new_paid, 3)
    }

# ==================== GOODS RECEIPT ====================

@router.get("/goods-receipts")
async def get_goods_receipts(
    po_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all goods receipts"""
    query = {}
    if po_id:
        query["po_id"] = po_id
    
    receipts = await db.goods_receipts.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return receipts

@router.post("/goods-receipts")
async def create_goods_receipt(receipt: GoodsReceiptCreate, current_user: dict = Depends(get_current_user)):
    """Create a goods receipt"""
    # Generate receipt number
    count = await db.goods_receipts.count_documents({})
    receipt_number = f"GR-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
    
    receipt_dict = receipt.model_dump()
    receipt_dict["id"] = str(uuid.uuid4())
    receipt_dict["receipt_number"] = receipt_number
    receipt_dict["received_by"] = current_user.get("id")
    receipt_dict["received_by_name"] = current_user.get("full_name", current_user.get("username"))
    receipt_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.goods_receipts.insert_one(receipt_dict)
    
    # Update PO item quantities
    po = await db.purchase_orders.find_one({"id": receipt.po_id})
    if po:
        all_received = True
        for gr_item in receipt_dict["items"]:
            for po_item in po.get("items", []):
                if po_item.get("id") == gr_item.get("po_item_id"):
                    new_qty = po_item.get("quantity_received", 0) + gr_item.get("quantity_accepted", 0)
                    po_item["quantity_received"] = new_qty
                    if new_qty < po_item.get("quantity", 0):
                        all_received = False
        
        new_status = POStatus.COMPLETED.value if all_received else POStatus.PARTIALLY_RECEIVED.value
        await db.purchase_orders.update_one(
            {"id": receipt.po_id},
            {"$set": {"items": po["items"], "status": new_status}}
        )
    
    # Update inventory
    total_receipt_value = 0
    for item in receipt_dict["items"]:
        item_value = item.get("quantity_accepted", 0) * item.get("unit_price", 0)
        total_receipt_value += item_value
        await db.inventory_items.update_one(
            {"name": item["item_name"]},
            {"$inc": {"current_quantity": item.get("quantity_accepted", 0)}}
        )
    
    # Create automatic journal entry for goods receipt
    # Dr: المخزون (1140) / Cr: الموردين (2110)
    if total_receipt_value > 0:
        try:
            await create_auto_journal_entry(
                description=f"استلام بضائع - {receipt_number} - أمر شراء {po.get('po_number', '')}",
                lines=[
                    {"account_number": "1130", "debit": round(total_receipt_value, 3), "credit": 0, "description": f"استلام مخزون - {receipt_number}"},
                    {"account_number": "2110", "debit": 0, "credit": round(total_receipt_value, 3), "description": f"مستحقات المورد - {po.get('vendor_name', '')}"}
                ],
                reference_type="goods_receipt",
                reference_id=receipt_dict["id"],
                created_by_id=current_user.get("id"),
                created_by_name=current_user.get("full_name", current_user.get("username"))
            )
        except Exception as e:
            print(f"Error creating journal entry: {e}")
    
    return receipt_dict

# ==================== INVENTORY ====================

@router.get("/inventory")
async def get_inventory(
    category: Optional[str] = None,
    low_stock: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all inventory items"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    items = await db.inventory_items.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    
    # Filter low stock if requested
    if low_stock:
        items = [i for i in items if i.get("current_quantity", 0) <= i.get("reorder_point", 0)]
    
    return items

@router.post("/inventory")
async def create_inventory_item(item: InventoryItemCreate, current_user: dict = Depends(get_current_user)):
    """Create an inventory item"""
    item_dict = item.model_dump()
    item_dict["id"] = str(uuid.uuid4())
    item_dict["current_quantity"] = 0.0
    item_dict["average_cost"] = 0.0
    item_dict["total_value"] = 0.0
    item_dict["is_active"] = True
    item_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.inventory_items.insert_one(item_dict)
    return item_dict

@router.put("/inventory/{item_id}")
async def update_inventory_item(item_id: str, item: InventoryItemCreate, current_user: dict = Depends(get_current_user)):
    """Update an inventory item"""
    item_dict = item.model_dump()
    item_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.inventory_items.update_one({"id": item_id}, {"$set": item_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Inventory item updated"}

@router.get("/inventory/alerts")
async def get_inventory_alerts(current_user: dict = Depends(get_current_user)):
    """Get low stock alerts"""
    items = await db.inventory_items.find({"is_active": True}, {"_id": 0}).to_list(500)
    alerts = []
    
    for item in items:
        current = item.get("current_quantity", 0)
        reorder = item.get("reorder_point", 0)
        min_qty = item.get("min_quantity", 0)
        
        if current <= 0:
            alerts.append({**item, "alert_type": "out_of_stock", "severity": "critical"})
        elif current <= min_qty:
            alerts.append({**item, "alert_type": "below_minimum", "severity": "high"})
        elif current <= reorder:
            alerts.append({**item, "alert_type": "reorder_needed", "severity": "medium"})
    
    return alerts

# ==================== VENDOR EVALUATION ====================

@router.get("/vendor-evaluations")
async def get_vendor_evaluations(
    vendor_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get vendor evaluations"""
    query = {}
    if vendor_id:
        query["vendor_id"] = vendor_id
    
    evaluations = await db.vendor_evaluations.find(query, {"_id": 0}).sort("evaluated_at", -1).to_list(100)
    return evaluations

@router.post("/vendor-evaluations")
async def create_vendor_evaluation(evaluation: VendorEvaluation, current_user: dict = Depends(get_current_user)):
    """Create a vendor evaluation"""
    eval_dict = evaluation.model_dump()
    eval_dict["id"] = str(uuid.uuid4())
    eval_dict["overall_score"] = (
        eval_dict["quality_score"] + eval_dict["delivery_score"] + 
        eval_dict["price_score"] + eval_dict["service_score"]
    ) / 4
    eval_dict["evaluated_by"] = current_user.get("id")
    eval_dict["evaluated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vendor_evaluations.insert_one(eval_dict)
    
    # Update vendor rating
    await db.procurement_vendors.update_one(
        {"id": evaluation.vendor_id},
        {"$set": {"rating": round(eval_dict["overall_score"])}}
    )
    
    return eval_dict

# ==================== ANALYTICS ====================

@router.get("/analytics/summary")
async def get_procurement_summary(current_user: dict = Depends(get_current_user)):
    """Get procurement analytics summary"""
    # Vendors stats
    total_vendors = await db.procurement_vendors.count_documents({"status": "active"})
    
    # Requisitions stats
    total_requisitions = await db.purchase_requisitions.count_documents({})
    pending_requisitions = await db.purchase_requisitions.count_documents({
        "status": {"$in": ["pending_dept_approval", "pending_finance_approval"]}
    })
    
    # PO stats
    total_pos = await db.purchase_orders.count_documents({})
    active_pos = await db.purchase_orders.count_documents({
        "status": {"$in": ["sent", "confirmed", "partially_received"]}
    })
    
    # Calculate total spending
    pos = await db.purchase_orders.find({"status": {"$ne": "cancelled"}}, {"total_amount": 1}).to_list(1000)
    total_spending = sum(po.get("total_amount", 0) for po in pos)
    
    # Inventory alerts
    alerts = await get_inventory_alerts(current_user)
    
    return {
        "vendors": {
            "total": total_vendors
        },
        "requisitions": {
            "total": total_requisitions,
            "pending": pending_requisitions
        },
        "purchase_orders": {
            "total": total_pos,
            "active": active_pos
        },
        "spending": {
            "total": total_spending
        },
        "inventory_alerts": len(alerts)
    }

@router.get("/analytics/spending-by-category")
async def get_spending_by_category(current_user: dict = Depends(get_current_user)):
    """Get spending breakdown by category"""
    pipeline = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$lookup": {
            "from": "procurement_vendors",
            "localField": "vendor_id",
            "foreignField": "id",
            "as": "vendor"
        }},
        {"$unwind": {"path": "$vendor", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": "$vendor.category",
            "total": {"$sum": "$total_amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await db.purchase_orders.aggregate(pipeline).to_list(20)
    return results

@router.get("/analytics/top-vendors")
async def get_top_vendors(current_user: dict = Depends(get_current_user)):
    """Get top vendors by spending"""
    vendors = await db.procurement_vendors.find(
        {"status": "active"},
        {"_id": 0}
    ).sort("total_amount", -1).limit(10).to_list(10)
    return vendors
