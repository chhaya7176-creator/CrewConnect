import os, requests
from dotenv import dotenv_values
from pymongo import MongoClient

BASE = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/")
env = dotenv_values("/app/backend/.env")
cli = MongoClient(env["MONGO_URL"])
db = cli[env["DB_NAME"]]

mobiles = [u.get("mobile") for u in db.users.find({}, {"mobile": 1}).limit(80)]
print("users:", len(mobiles))
found = []
for m in mobiles:
    if not m:
        continue
    try:
        requests.post(f"{BASE}/api/auth/request-otp", json={"mobile": m}, timeout=20)
        r = requests.post(f"{BASE}/api/auth/verify-otp", json={"mobile": m, "otp": "123456"}, timeout=20)
        if r.status_code != 200:
            continue
        tok = r.json()["token"]
        mr = requests.get(f"{BASE}/api/matches", headers={"Authorization": f"Bearer {tok}"}, timeout=30)
        d = mr.json()
        nm = len(d.get("near_matches") or [])
        mt = len(d.get("matches") or [])
        if d.get("role") and (mt == 0 and nm > 0):
            print("CANDIDATE (0 match, near>0):", m, d.get("role"), "near:", nm,
                  "gaps sample:", (d["near_matches"][0].get("gaps")))
            found.append(m)
        elif d.get("role"):
            print(m, d.get("role"), "matches:", mt, "near:", nm)
    except Exception as e:
        print("err", m, e)
print("FOUND:", found)
