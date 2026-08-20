"""Seed fresh seeker/provider accounts for frontend E2E so demo accounts keep their state."""
import json
import sys
import requests
from dotenv import dotenv_values

BASE = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
OTP = "123456"


def login(mobile):
    requests.post(f"{BASE}/auth/request-otp", json={"mobile": mobile}, timeout=30)
    r = requests.post(f"{BASE}/auth/verify-otp", json={"mobile": mobile, "otp": OTP}, timeout=30)
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['token']}"}


SEEKER = {
    "rank": "Chief Engineer", "vessel_type": "Oil Tanker", "sea_time": "3-5 years",
    "coc": "India", "us_visa": "Yes (C1/D valid)", "consent": True,
    "name": "TEST QA Seeker", "email": "qa_seeker@example.test", "availability": "Immediate",
    "summary": "TEST QA seeker summary for E2E gating checks.",
}
PROVIDER = {
    "rank": "Chief Engineer", "vessel_type": "Oil Tanker", "sea_time": "3-5 years",
    "coc": ["India"], "us_visa": "Preferred", "consent": True,
    "company_name": "TEST QA Marine Ltd", "email": "qa_company@example.test",
    "availability": "Immediate", "summary": "TEST QA provider requirement for E2E.",
}

out = {}
for key, mob in [("seeker_referral", "+919111100001"), ("seeker_pay", "+919111100002")]:
    h = login(mob)
    requests.post(f"{BASE}/seeker/profile", json=dict(SEEKER, mobile=mob), headers=h, timeout=30).raise_for_status()
    out[key] = mob

h = login("+919111100003")
requests.post(f"{BASE}/provider/requirement", json=dict(PROVIDER, mobile="+919111100003"), headers=h, timeout=30).raise_for_status()
out["provider"] = "+919111100003"

print(json.dumps(out, indent=1))
