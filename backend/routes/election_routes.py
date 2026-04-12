"""
نظام ترشيح وتصويت الموردين
Supplier Election & Voting System
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import base64

# توقيت عُمان UTC+4
OMAN_TZ = timezone(timedelta(hours=4))
import os
import motor.motor_asyncio

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "milk_erp")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)

UPLOAD_DIR = "/app/backend/uploads/candidates"
os.makedirs(UPLOAD_DIR, exist_ok=True)
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/elections", tags=["Elections"])


# ===== Models =====
class Election(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    centers: List[str] = ["زيك", "حجيف", "غدو"]  # المراكز المشاركة
    nomination_start: str  # ISO date
    nomination_end: str
    voting_start: str
    voting_end: str
    status: str = "draft"  # draft, nomination, voting, closed
    created_at: str = Field(default_factory=lambda: datetime.now(OMAN_TZ).isoformat())
    created_by: Optional[str] = None


class CandidateRegister(BaseModel):
    election_id: str
    supplier_code: Optional[str] = None
    name: str
    national_id: Optional[str] = None
    supply_type: Optional[str] = None
    center_name: Optional[str] = None
    photo: Optional[str] = None  # Base64 encoded photo


class VoteCast(BaseModel):
    election_id: str
    voter_supplier_code: str
    voter_center: str  # مركز المصوت
    candidate_id: str


# ===== Helper =====
def get_election_status(election: dict) -> str:
    """تحديد حالة الانتخاب بناءً على توقيت عُمان UTC+4"""
    now = datetime.now(OMAN_TZ).strftime("%Y-%m-%dT%H:%M")
    nom_start = election.get("nomination_start", "")[:16]
    nom_end = election.get("nomination_end", "")[:16]
    vote_start = election.get("voting_start", "")[:16]
    vote_end = election.get("voting_end", "")[:16]
    
    if now < nom_start:
        return "draft"
    elif now <= nom_end:
        return "nomination"
    elif now < vote_start:
        return "pending_voting"
    elif now <= vote_end:
        return "voting"
    else:
        return "closed"


# ===== Admin Endpoints =====
@router.post("/create")
async def create_election(data: Election):
    election = data.model_dump()
    election["status"] = get_election_status(election)
    await db.supplier_elections.insert_one(election)
    election.pop("_id", None)
    return election


@router.get("/list")
async def list_elections():
    elections = await db.supplier_elections.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for e in elections:
        e["status"] = get_election_status(e)
        # Get counts
        e["candidates_count"] = await db.supplier_candidates.count_documents({"election_id": e["id"]})
        e["votes_count"] = await db.supplier_votes.count_documents({"election_id": e["id"]})
    return elections


@router.get("/{election_id}")
async def get_election(election_id: str):
    election = await db.supplier_elections.find_one({"id": election_id}, {"_id": 0})
    if not election:
        raise HTTPException(status_code=404, detail="الانتخاب غير موجود")
    election["status"] = get_election_status(election)
    return election


@router.get("/{election_id}/results")
async def get_election_results(election_id: str):
    """نتائج التصويت مصنفة حسب المركز - للمسؤول فقط"""
    election = await db.supplier_elections.find_one({"id": election_id}, {"_id": 0})
    if not election:
        raise HTTPException(status_code=404, detail="الانتخاب غير موجود")

    candidates = await db.supplier_candidates.find(
        {"election_id": election_id}, {"_id": 0}
    ).to_list(200)

    for c in candidates:
        c["votes_count"] = await db.supplier_votes.count_documents({
            "election_id": election_id, "candidate_id": c["id"]
        })

    # Group by center
    centers = election.get("centers", ["زيك", "حجيف", "غدو"])
    results_by_center = {}
    for center in centers:
        center_candidates = [c for c in candidates if c.get("center_name") == center]
        center_candidates.sort(key=lambda x: x["votes_count"], reverse=True)
        center_votes = sum(c["votes_count"] for c in center_candidates)
        winner = center_candidates[0] if center_candidates and center_candidates[0]["votes_count"] > 0 else None
        results_by_center[center] = {
            "candidates": center_candidates,
            "total_votes": center_votes,
            "winner": winner
        }

    total_votes = await db.supplier_votes.count_documents({"election_id": election_id})

    return {
        "election": election,
        "results_by_center": results_by_center,
        "all_candidates": candidates,
        "total_votes": total_votes
    }


@router.delete("/{election_id}")
async def delete_election(election_id: str):
    await db.supplier_elections.delete_one({"id": election_id})
    await db.supplier_candidates.delete_many({"election_id": election_id})
    await db.supplier_votes.delete_many({"election_id": election_id})
    return {"success": True}


# ===== Candidate (Supplier-facing) =====
@router.get("/{election_id}/candidates")
async def get_candidates(election_id: str):
    """قائمة المرشحين - بدون عدد الأصوات"""
    candidates = await db.supplier_candidates.find(
        {"election_id": election_id}, {"_id": 0}
    ).to_list(100)
    return candidates


@router.post("/register-candidate")
async def register_candidate(data: CandidateRegister):
    election = await db.supplier_elections.find_one({"id": data.election_id}, {"_id": 0})
    if not election:
        raise HTTPException(status_code=404, detail="الانتخاب غير موجود")

    status = get_election_status(election)
    if status != "nomination":
        raise HTTPException(status_code=400, detail="فترة الترشيح غير مفتوحة")

    # التحقق من وجود صورة إثبات
    if not data.photo:
        raise HTTPException(status_code=400, detail="يرجى التقاط صورة شخصية للإثبات")

    # Validate center
    centers = election.get("centers", ["زيك", "حجيف", "غدو"])
    if data.center_name and data.center_name not in centers:
        raise HTTPException(status_code=400, detail=f"المركز غير صحيح. المراكز المتاحة: {', '.join(centers)}")

    if not data.center_name:
        raise HTTPException(status_code=400, detail="يرجى اختيار مركز التوريد")

    # Check if already registered
    if data.supplier_code:
        existing = await db.supplier_candidates.find_one({
            "election_id": data.election_id,
            "supplier_code": data.supplier_code
        })
        if existing:
            raise HTTPException(status_code=400, detail="هذا المورد مسجل مسبقاً كمرشح")
    
    if data.national_id:
        existing = await db.supplier_candidates.find_one({
            "election_id": data.election_id,
            "national_id": data.national_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="هذا المورد مسجل مسبقاً كمرشح")

    candidate_id = str(uuid.uuid4())

    # حفظ الصورة
    photo_filename = None
    if data.photo:
        try:
            photo_data = data.photo.split(",")[1] if "," in data.photo else data.photo
            photo_bytes = base64.b64decode(photo_data)
            photo_filename = f"{candidate_id}.jpg"
            photo_path = os.path.join(UPLOAD_DIR, photo_filename)
            with open(photo_path, "wb") as f:
                f.write(photo_bytes)
        except Exception:
            raise HTTPException(status_code=400, detail="خطأ في حفظ الصورة")

    candidate = {
        "id": candidate_id,
        "election_id": data.election_id,
        "supplier_code": data.supplier_code,
        "name": data.name,
        "national_id": data.national_id,
        "supply_type": data.supply_type,
        "center_name": data.center_name,
        "photo": photo_filename,
        "registered_at": datetime.now(OMAN_TZ).isoformat()
    }
    await db.supplier_candidates.insert_one(candidate)
    candidate.pop("_id", None)
    return candidate


@router.get("/candidate-photo/{filename}")
async def get_candidate_photo(filename: str):
    """عرض صورة المرشح"""
    photo_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(photo_path):
        raise HTTPException(status_code=404, detail="الصورة غير موجودة")
    return FileResponse(photo_path, media_type="image/jpeg")



@router.get("/lookup-supplier/{supplier_code}")
async def lookup_supplier(supplier_code: str):
    """البحث عن مورد بالكود لتعبئة البيانات تلقائياً"""
    supplier = await db.suppliers.find_one(
        {"supplier_code": supplier_code},
        {"_id": 0, "name": 1, "supplier_code": 1, "national_id": 1,
         "center_name": 1, "milk_type": 1, "phone": 1}
    )
    if not supplier:
        return {"found": False}
    return {"found": True, "supplier": supplier}


# ===== Voting (Supplier-facing) =====
@router.post("/vote")
async def cast_vote(data: VoteCast):
    election = await db.supplier_elections.find_one({"id": data.election_id}, {"_id": 0})
    if not election:
        raise HTTPException(status_code=404, detail="الانتخاب غير موجود")

    status = get_election_status(election)
    if status != "voting":
        raise HTTPException(status_code=400, detail="فترة التصويت غير مفتوحة")

    # Check candidate exists
    candidate = await db.supplier_candidates.find_one({
        "id": data.candidate_id, "election_id": data.election_id
    })
    if not candidate:
        raise HTTPException(status_code=404, detail="المرشح غير موجود")

    # المصوت يجب أن يصوت لمرشح من نفس مركزه
    if candidate.get("center_name") != data.voter_center:
        raise HTTPException(status_code=400, detail="يجب التصويت لمرشح من نفس مركزك")

    # Check if already voted in this center
    existing_vote = await db.supplier_votes.find_one({
        "election_id": data.election_id,
        "voter_supplier_code": data.voter_supplier_code,
        "voter_center": data.voter_center
    })
    if existing_vote:
        raise HTTPException(status_code=400, detail="لقد قمت بالتصويت مسبقاً في هذا المركز")

    # Cannot vote for yourself
    if candidate.get("supplier_code") == data.voter_supplier_code:
        raise HTTPException(status_code=400, detail="لا يمكنك التصويت لنفسك")

    vote = {
        "id": str(uuid.uuid4()),
        "election_id": data.election_id,
        "voter_supplier_code": data.voter_supplier_code,
        "voter_center": data.voter_center,
        "candidate_id": data.candidate_id,
        "voted_at": datetime.now(OMAN_TZ).isoformat()
    }
    await db.supplier_votes.insert_one(vote)
    vote.pop("_id", None)
    return {"success": True, "message": "تم التصويت بنجاح"}


@router.get("/check-vote/{election_id}/{supplier_code}/{center}")
async def check_vote(election_id: str, supplier_code: str, center: str):
    """التحقق إذا صوت المورد مسبقاً في مركزه"""
    vote = await db.supplier_votes.find_one({
        "election_id": election_id,
        "voter_supplier_code": supplier_code,
        "voter_center": center
    }, {"_id": 0})
    return {"has_voted": vote is not None, "vote": vote}
