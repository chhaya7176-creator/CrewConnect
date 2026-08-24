"""Seed a saved search for the company demo account with a backdated
last_viewed_at so the frontend `N new` badge and per-card NEW tag can be
verified in the UI."""
import asyncio
import os

import requests
from dotenv import dotenv_values, load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")
BASE = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
MOBILE = "+919930867220"


def api_login():
    requests.post(f"{BASE}/auth/request-otp", json={"mobile": MOBILE}, timeout=30).raise_for_status()
    r = requests.post(f"{BASE}/auth/verify-otp", json={"mobile": MOBILE, "otp": "123456"}, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


async def main():
    token = api_login()
    h = {"Authorization": f"Bearer {token}"}
    m = requests.get(f"{BASE}/matches", headers=h, timeout=30).json()
    req = m["requirement"]
    crit = {k: req.get(k) for k in ("rank", "vessel_type", "sea_time", "sea_time_priority", "coc", "coc_priority", "us_visa")}
    r = requests.post(f"{BASE}/saved-searches", headers=h,
                      json={"name": "TEST_new-badge", "criteria": crit}, timeout=30)
    print("create:", r.status_code, r.json().get("id"))
    sid = r.json()["id"]

    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    await db.saved_searches.update_one({"id": sid}, {"$set": {"last_viewed_at": "2000-01-01T00:00:00+00:00"}})
    print("backdated last_viewed_at for", sid)
    listed = requests.get(f"{BASE}/saved-searches", headers=h, timeout=30).json()["searches"]
    print("list:", [(s["name"], s["count"], s["new_count"]) for s in listed])
    client.close()


asyncio.run(main())
