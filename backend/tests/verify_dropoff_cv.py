"""Verify UI-uploaded CV persisted for a dropped-off seeker (mobile from Playwright run)."""
import os, sys, requests
from dotenv import dotenv_values

API = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/") + "/api"
mobile = sys.argv[1]
requests.post(f"{API}/auth/request-otp", json={"mobile": mobile}).raise_for_status()
v = requests.post(f"{API}/auth/verify-otp", json={"mobile": mobile, "otp": "123456"})
v.raise_for_status()
tok = v.json()["token"]
print("user:", {k: v.json()["user"].get(k) for k in ("id", "mobile", "name")})
docs = requests.get(f"{API}/documents", headers={"Authorization": f"Bearer {tok}"}).json()
print("documents:", docs)
me = requests.get(f"{API}/me", headers={"Authorization": f"Bearer {tok}"})
print("me:", me.status_code, str(me.json())[:400])
assert any(d["category"] == "CV / Resume" for d in docs), "CV not persisted!"
print("PASS: CV persisted after drop-off")
