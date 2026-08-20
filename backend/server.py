from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Query, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import requests
import jwt
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev_secret')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# ---------------- Object storage ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "maritime-connect"
storage_key = None
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
    "webp": "image/webp", "pdf": "application/pdf", "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
}


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------- Config / Dropdown data ----------------
RANKS = [
    "Captain / Master", "Chief Officer", "Second Officer", "Third Officer",
    "Deck Cadet", "Chief Engineer", "Second Engineer", "Third Engineer",
    "Fourth Engineer", "Engine Cadet", "Electrical Officer (ETO)", "Bosun",
    "Able Seaman (AB)", "Ordinary Seaman (OS)", "Oiler", "Fitter",
    "Chief Cook", "Steward / Messman",
]
VESSEL_TYPES = [
    "Container", "Oil Tanker", "Chemical Tanker", "LNG / LPG Tanker",
    "Bulk Carrier", "General Cargo", "RoRo", "Passenger / Cruise",
    "Offshore / OSV", "Reefer", "Car Carrier",
]
SEA_TIME = ["0–9 months", "9–18 months", "18–30 months", "30+ months"]
COC_SEEKER = [
    "India", "Indonesia", "UK", "Singapore", "Australia", "Bangladesh",
    "Myanmar", "Sri Lanka", "Malaysia", "New Zealand", "Bahamas", "Panama",
    "Honduras", "Liberia", "Fiji", "Ukraine", "Others",
]
COC_PROVIDER = [
    "India", "Indonesia", "UK", "Singapore", "Australia", "Bangladesh",
    "Myanmar", "Sri Lanka", "Malaysia", "New Zealand", "Bahamas", "Panama",
    "Honduras", "Liberia", "Fiji", "Ethiopia", "Ukraine", "Any", "Others",
]
US_VISA_SEEKER = ["Valid", "Not Valid", "Not Available"]
US_VISA_PROVIDER = ["Must Have", "Preferred", "Not Required"]


@api_router.get("/config")
async def get_config():
    return {
        "ranks": RANKS,
        "vessel_types": VESSEL_TYPES,
        "sea_time": SEA_TIME,
        "coc_seeker": COC_SEEKER,
        "coc_provider": COC_PROVIDER,
        "us_visa_seeker": US_VISA_SEEKER,
        "us_visa_provider": US_VISA_PROVIDER,
    }


# ---------------- Models ----------------
class OTPRequest(BaseModel):
    mobile: str


class OTPVerify(BaseModel):
    mobile: str
    otp: str


class SummaryRequest(BaseModel):
    role: str  # seeker | provider
    data: dict


class SeekerProfile(BaseModel):
    rank: str
    vessel_type: str
    sea_time: str
    coc: str
    us_visa: str
    other_visa: Optional[str] = ""
    mobile: str
    consent: bool
    name: str
    email: str
    availability: str
    summary: Optional[str] = ""
    boosted: bool = False


class ProviderRequirement(BaseModel):
    rank: str
    vessel_type: str
    sea_time: str
    coc: List[str]
    us_visa: str
    mobile: str
    consent: bool
    company_name: str
    email: str
    availability: str
    summary: Optional[str] = ""


class FeedbackIn(BaseModel):
    category: str
    message: str


# ---------------- Auth helpers ----------------
def create_token(user_id: str, mobile: str) -> str:
    payload = {
        "user_id": user_id,
        "mobile": mobile,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------- Auth endpoints ----------------
@api_router.post("/auth/request-otp")
async def request_otp(req: OTPRequest):
    digits = "".join(c for c in req.mobile if c.isdigit())
    if len(digits) < 10 or len(digits) > 15:
        raise HTTPException(status_code=400, detail="Mobile number must be 10–15 digits")
    otp = "123456"  # simulated OTP for demo
    await db.otps.update_one(
        {"mobile": req.mobile},
        {"$set": {"mobile": req.mobile, "otp": otp, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    # In demo mode we return the OTP so the UI can show it
    return {"success": True, "demo_otp": otp, "message": "OTP sent (demo mode)"}


@api_router.post("/auth/verify-otp")
async def verify_otp(req: OTPVerify):
    record = await db.otps.find_one({"mobile": req.mobile}, {"_id": 0})
    if not record or record["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    user = await db.users.find_one({"mobile": req.mobile}, {"_id": 0})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "mobile": req.mobile,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(dict(user))
    token = create_token(user["id"], user["mobile"])
    return {"token": token, "user": user}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------------- AI summary ----------------
async def generate_ai_summary(role: str, data: dict) -> str:
    fallback = build_template_summary(role, data)
    if not EMERGENT_LLM_KEY:
        return fallback
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        if role == "seeker":
            sys = ("You are a maritime crewing assistant. Write a crisp, professional 2-3 sentence "
                   "profile summary for a seafarer job seeker based on the JSON data. Highlight rank, "
                   "vessel experience, sea time, certification and availability. Do not invent facts. "
                   "Do not include the mobile number. Keep under 60 words.")
        else:
            sys = ("You are a maritime crewing assistant. Write a crisp, professional 2-3 sentence "
                   "crew requirement summary for a shipping company based on the JSON data. Highlight "
                   "the required rank, vessel type, experience, certification preferences and joining "
                   "timeline. Do not invent facts. Keep under 60 words.")
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()), system_message=sys).with_model("openai", "gpt-5.4")
        msg = UserMessage(text=f"Data: {data}")
        resp = await chat.send_message(msg)
        text = resp if isinstance(resp, str) else str(resp)
        return text.strip() or fallback
    except Exception as e:
        logger.warning(f"AI summary failed: {e}")
        return fallback


def build_template_summary(role: str, d: dict) -> str:
    if role == "seeker":
        return (f"{d.get('rank','Seafarer')} with {d.get('sea_time','')} of sea time on "
                f"{d.get('vessel_type','')} vessels. Holds {d.get('coc','')} COC, US Visa status: "
                f"{d.get('us_visa','')}. Available from {d.get('availability','')}.")
    coc = d.get('coc')
    coc = ", ".join(coc) if isinstance(coc, list) else coc
    return (f"Seeking a {d.get('rank','crew')} for {d.get('vessel_type','')} vessels with "
            f"{d.get('sea_time','')} experience. Preferred COC: {coc}. US Visa: {d.get('us_visa','')}. "
            f"Joining: {d.get('availability','')}.")


@api_router.post("/ai/summary")
async def ai_summary(req: SummaryRequest):
    summary = await generate_ai_summary(req.role, req.data)
    return {"summary": summary}


# ---------------- Profile submission ----------------
@api_router.post("/seeker/profile")
async def create_seeker(profile: SeekerProfile, user=Depends(get_current_user)):
    doc = profile.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["role"] = "seeker"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["referral_code"] = uuid.uuid4().hex[:8]
    await db.seekers.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api_router.post("/provider/requirement")
async def create_provider(req: ProviderRequirement, user=Depends(get_current_user)):
    doc = req.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["role"] = "provider"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["referral_code"] = uuid.uuid4().hex[:8]
    await db.providers.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


# ---------------- Matching ----------------
def sea_time_rank(s: str) -> int:
    return {"0–9 months": 0, "9–18 months": 1, "18–30 months": 2, "30+ months": 3}.get(s, 0)


def matches_requirement(seeker: dict, req: dict) -> bool:
    if seeker["rank"] != req["rank"]:
        return False
    if seeker["vessel_type"] != req["vessel_type"] and req["vessel_type"] not in ("Any",):
        return False
    if sea_time_rank(seeker["sea_time"]) < sea_time_rank(req["sea_time"]):
        return False
    coc_list = req.get("coc", [])
    if "Any" not in coc_list and seeker["coc"] not in coc_list:
        return False
    return True


def redact_seeker(seeker: dict, unlocked: bool) -> dict:
    out = {
        "id": seeker["id"],
        "rank": seeker["rank"],
        "vessel_type": seeker["vessel_type"],
        "sea_time": seeker["sea_time"],
        "coc": seeker["coc"],
        "us_visa": seeker["us_visa"],
        "other_visa": seeker.get("other_visa", ""),
        "availability": seeker["availability"],
        "summary": seeker.get("summary", ""),
        "boosted": seeker.get("boosted", False),
        "unlocked": unlocked,
    }
    if unlocked:
        out.update({"name": seeker["name"], "mobile": seeker["mobile"], "email": seeker["email"]})
    else:
        out.update({"name": "🔒 Locked", "mobile": "🔒 Locked", "email": "🔒 Locked"})
    return out


@api_router.get("/matches")
async def get_matches(user=Depends(get_current_user)):
    seeker = await db.seekers.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    provider = await db.providers.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)])

    result = {"role": None, "matches": []}

    if provider:
        result["role"] = "provider"
        unlocks = await db.unlocks.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
        unlocked_ids = {u["seeker_id"] for u in unlocks}
        seekers = await db.seekers.find({}, {"_id": 0}).to_list(1000)
        matched = [s for s in seekers if matches_requirement(s, provider)]
        matched.sort(key=lambda s: (not s.get("boosted", False), s.get("created_at", "")), reverse=False)
        result["matches"] = [redact_seeker(s, s["id"] in unlocked_ids) for s in matched]
        result["requirement"] = provider
    elif seeker:
        result["role"] = "seeker"
        providers = await db.providers.find({}, {"_id": 0}).to_list(1000)
        matched = [p for p in providers if matches_requirement(seeker, p)]
        result["matches"] = [{
            "id": p["id"],
            "company_name": p["company_name"],
            "rank": p["rank"],
            "vessel_type": p["vessel_type"],
            "sea_time": p["sea_time"],
            "coc": p["coc"],
            "us_visa": p["us_visa"],
            "availability": p["availability"],
            "summary": p.get("summary", ""),
        } for p in matched]
        result["profile"] = seeker
    return result


class UnlockRequest(BaseModel):
    seeker_id: str


@api_router.post("/unlock-cv")
async def unlock_cv(req: UnlockRequest, user=Depends(get_current_user)):
    seeker = await db.seekers.find_one({"id": req.seeker_id}, {"_id": 0})
    if not seeker:
        raise HTTPException(status_code=404, detail="Profile not found")
    # mock payment of ₹20
    await db.unlocks.update_one(
        {"user_id": user["id"], "seeker_id": req.seeker_id},
        {"$set": {"user_id": user["id"], "seeker_id": req.seeker_id,
                  "amount": 20, "at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"success": True, "amount": 20, "cv": redact_seeker(seeker, True)}


@api_router.post("/boost-profile")
async def boost_profile(user=Depends(get_current_user)):
    seeker = await db.seekers.find_one({"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    if not seeker:
        raise HTTPException(status_code=404, detail="No profile to boost")
    await db.seekers.update_one({"id": seeker["id"]}, {"$set": {"boosted": True}})
    await db.payments.insert_one({"user_id": user["id"], "type": "boost", "amount": 100,
                                  "at": datetime.now(timezone.utc).isoformat()})
    return {"success": True, "amount": 100, "boosted": True}


@api_router.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    seekers = await db.seekers.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    providers = await db.providers.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    unlocks = await db.unlocks.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    payments = await db.payments.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    docs_count = await db.documents.count_documents({"user_id": user["id"], "is_deleted": False})
    return {
        "seeker_profiles": seekers,
        "provider_requirements": providers,
        "unlocks": unlocks,
        "payments": payments,
        "documents_count": docs_count,
    }


@api_router.post("/feedback")
async def submit_feedback(fb: FeedbackIn, user=Depends(get_current_user)):
    doc = fb.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.feedback.insert_one(dict(doc))
    return {"success": True}


# ---------------- Documents ----------------
MAX_TOTAL_BYTES = 100 * 1024 * 1024  # 100 MB per user


async def user_storage_used(user_id: str) -> int:
    pipeline = [
        {"$match": {"user_id": user_id, "is_deleted": False}},
        {"$group": {"_id": None, "total": {"$sum": "$size"}}},
    ]
    agg = await db.documents.aggregate(pipeline).to_list(1)
    return agg[0]["total"] if agg else 0


@api_router.get("/documents/usage")
async def documents_usage(user=Depends(get_current_user)):
    used = await user_storage_used(user["id"])
    return {"used": used, "limit": MAX_TOTAL_BYTES, "remaining": max(0, MAX_TOTAL_BYTES - used)}


@api_router.post("/documents")
async def upload_document(file: UploadFile = File(...), category: str = Query("Other"),
                          user=Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    data = await file.read()
    size = len(data)
    used = await user_storage_used(user["id"])
    if used + size > MAX_TOTAL_BYTES:
        remaining_mb = max(0, MAX_TOTAL_BYTES - used) / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Storage limit of 100 MB reached. You have {remaining_mb:.1f} MB free.",
        )
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    result = put_object(path, data, content_type)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "storage_path": result["path"],
        "original_filename": file.filename,
        "category": category,
        "content_type": content_type,
        "size": result.get("size", size),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.documents.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api_router.get("/documents")
async def list_documents(user=Depends(get_current_user)):
    docs = await db.documents.find({"user_id": user["id"], "is_deleted": False}, {"_id": 0}).to_list(1000)
    return docs


@api_router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, authorization: Optional[str] = Header(None),
                            auth: Optional[str] = Query(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    record = await db.documents.find_one({"id": doc_id, "is_deleted": False}, {"_id": 0})
    if not record or record["user_id"] != payload["user_id"]:
        raise HTTPException(status_code=404, detail="Document not found")
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type),
                    headers={"Content-Disposition": f'inline; filename="{record["original_filename"]}"'})


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    record = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not record or record["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.documents.update_one({"id": doc_id}, {"$set": {"is_deleted": True}})
    return {"success": True}


# ---------------- Movement / Availability ----------------
class MovementIn(BaseModel):
    status: str  # Onboard | On Leave | Available Now | Available From
    available_from: Optional[str] = ""
    vessel: Optional[str] = ""
    note: Optional[str] = ""


@api_router.post("/movement")
async def add_movement(m: MovementIn, user=Depends(get_current_user)):
    doc = m.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.movements.insert_one(dict(doc))
    await db.users.update_one({"id": user["id"]}, {"$set": {
        "current_status": m.status, "available_from": m.available_from, "current_vessel": m.vessel,
    }})
    doc.pop("_id", None)
    return doc


@api_router.get("/movement")
async def list_movements(user=Depends(get_current_user)):
    items = await db.movements.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    latest = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"history": items, "current": {
        "status": latest.get("current_status", ""),
        "available_from": latest.get("available_from", ""),
        "vessel": latest.get("current_vessel", ""),
    }}


@api_router.get("/")
async def root():
    return {"message": "Maritime Connect API"}


# ---------------- Seed sample data ----------------
SAMPLE_SEEKERS = [
    {"rank": "Chief Engineer", "vessel_type": "Oil Tanker", "sea_time": "30+ months", "coc": "India",
     "us_visa": "Valid", "other_visa": "Schengen", "name": "Rajesh Nair", "mobile": "+919812345670",
     "email": "rajesh.nair@example.com", "availability": "Immediate", "boosted": True},
    {"rank": "Chief Engineer", "vessel_type": "Oil Tanker", "sea_time": "18–30 months", "coc": "Singapore",
     "us_visa": "Not Available", "other_visa": "", "name": "Wei Chen", "mobile": "+6591234567",
     "email": "wei.chen@example.com", "availability": "01/07/2026", "boosted": False},
    {"rank": "Captain / Master", "vessel_type": "Container", "sea_time": "30+ months", "coc": "UK",
     "us_visa": "Valid", "other_visa": "UK", "name": "James Whitfield", "mobile": "+447700900123",
     "email": "james.w@example.com", "availability": "Immediate", "boosted": False},
    {"rank": "Second Officer", "vessel_type": "Bulk Carrier", "sea_time": "9–18 months", "coc": "Indonesia",
     "us_visa": "Not Valid", "other_visa": "", "name": "Budi Santoso", "mobile": "+628123456789",
     "email": "budi.s@example.com", "availability": "15/07/2026", "boosted": True},
    {"rank": "Able Seaman (AB)", "vessel_type": "Container", "sea_time": "18–30 months", "coc": "Philippines",
     "us_visa": "Valid", "other_visa": "", "name": "Mario Reyes", "mobile": "+639171234567",
     "email": "mario.r@example.com", "availability": "Immediate", "boosted": False},
    {"rank": "Third Engineer", "vessel_type": "LNG / LPG Tanker", "sea_time": "9–18 months", "coc": "India",
     "us_visa": "Not Available", "other_visa": "", "name": "Arjun Menon", "mobile": "+919876500011",
     "email": "arjun.m@example.com", "availability": "10/08/2026", "boosted": False},
]

SAMPLE_PROVIDERS = [
    {"rank": "Chief Engineer", "vessel_type": "Oil Tanker", "sea_time": "18–30 months",
     "coc": ["India", "Singapore", "UK"], "us_visa": "Preferred", "company_name": "Oceanic Tankers Ltd",
     "email": "crewing@oceanictankers.com", "availability": "Immediate"},
    {"rank": "Captain / Master", "vessel_type": "Container", "sea_time": "30+ months",
     "coc": ["Any"], "us_visa": "Must Have", "company_name": "BlueLine Container Co",
     "email": "hr@blueline.com", "availability": "01/08/2026"},
    {"rank": "Second Officer", "vessel_type": "Bulk Carrier", "sea_time": "0–9 months",
     "coc": ["Indonesia", "India", "Any"], "us_visa": "Not Required", "company_name": "Global Bulk Shipping",
     "email": "careers@globalbulk.com", "availability": "Immediate"},
]


@app.on_event("startup")
async def seed_data():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    if await db.seekers.count_documents({"seed": True}) == 0:
        for s in SAMPLE_SEEKERS:
            doc = dict(s)
            doc.update({
                "id": str(uuid.uuid4()), "user_id": "seed", "role": "seeker", "seed": True,
                "consent": True, "summary": build_template_summary("seeker", s),
                "referral_code": uuid.uuid4().hex[:8],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            await db.seekers.insert_one(doc)
    if await db.providers.count_documents({"seed": True}) == 0:
        for p in SAMPLE_PROVIDERS:
            doc = dict(p)
            doc.update({
                "id": str(uuid.uuid4()), "user_id": "seed", "role": "provider", "seed": True,
                "consent": True, "summary": build_template_summary("provider", p),
                "referral_code": uuid.uuid4().hex[:8],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            await db.providers.insert_one(doc)
    logger.info("Seed data ensured")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
