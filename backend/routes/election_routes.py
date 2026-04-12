"""
نظام ترشيح وتصويت الموردين
Supplier Election & Voting System
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
import motor.motor_asyncio

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "milk_erp")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/elections", tags=["Elections"])


# ===== Models =====
class Election(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    nomination_start: str  # ISO date
    nomination_end: str
    voting_start: str
    voting_end: str
    status: str = "draft"  # draft, nomination, voting, closed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None


class CandidateRegister(BaseModel):
    election_id: str
    supplier_code: Optional[str] = None
    name: str
    national_id: Optional[str] = None
    supply_type: Optional[str] = None
    center_name: Optional[str] = None


class VoteCast(BaseModel):
    election_id: str
    voter_supplier_code: str
    candidate_id: str


# ===== Helper =====
def get_election_status(election: dict) -> str:
    now = datetime.now(timezone.utc).isoformat()
    if now < election["nomination_start"]:
        return "draft"
    elif now <= election["nomination_end"]:
        return "nomination"
    elif now < election["voting_start"]:
        return "pending_voting"
    elif now <= election["voting_end"]:
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
    """نتائج التصويت - للمسؤول فقط"""
    election = await db.supplier_elections.find_one({"id": election_id}, {"_id": 0})
    if not election:
        raise HTTPException(status_code=404, detail="الانتخاب غير موجود")

    candidates = await db.supplier_candidates.find(
        {"election_id": election_id}, {"_id": 0}
    ).to_list(100)

    for c in candidates:
        c["votes_count"] = await db.supplier_votes.count_documents({
            "election_id": election_id, "candidate_id": c["id"]
        })

    candidates.sort(key=lambda x: x["votes_count"], reverse=True)
    total_votes = await db.supplier_votes.count_documents({"election_id": election_id})

    return {
        "election": election,
        "candidates": candidates,
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

    # Check if already registered
    existing = await db.supplier_candidates.find_one({
        "election_id": data.election_id,
        "$or": [
            {"supplier_code": data.supplier_code},
            {"national_id": data.national_id}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="هذا المورد مسجل مسبقاً كمرشح")

    candidate = {
        "id": str(uuid.uuid4()),
        "election_id": data.election_id,
        "supplier_code": data.supplier_code,
        "name": data.name,
        "national_id": data.national_id,
        "supply_type": data.supply_type,
        "center_name": data.center_name,
        "registered_at": datetime.now(timezone.utc).isoformat()
    }
    await db.supplier_candidates.insert_one(candidate)
    candidate.pop("_id", None)
    return candidate


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

    # Check if already voted
    existing_vote = await db.supplier_votes.find_one({
        "election_id": data.election_id,
        "voter_supplier_code": data.voter_supplier_code
    })
    if existing_vote:
        raise HTTPException(status_code=400, detail="لقد قمت بالتصويت مسبقاً")

    # Cannot vote for yourself
    if candidate.get("supplier_code") == data.voter_supplier_code:
        raise HTTPException(status_code=400, detail="لا يمكنك التصويت لنفسك")

    vote = {
        "id": str(uuid.uuid4()),
        "election_id": data.election_id,
        "voter_supplier_code": data.voter_supplier_code,
        "candidate_id": data.candidate_id,
        "voted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.supplier_votes.insert_one(vote)
    vote.pop("_id", None)
    return {"success": True, "message": "تم التصويت بنجاح"}


@router.get("/check-vote/{election_id}/{supplier_code}")
async def check_vote(election_id: str, supplier_code: str):
    """التحقق إذا صوت المورد مسبقاً"""
    vote = await db.supplier_votes.find_one({
        "election_id": election_id,
        "voter_supplier_code": supplier_code
    }, {"_id": 0})
    return {"has_voted": vote is not None, "vote": vote}
