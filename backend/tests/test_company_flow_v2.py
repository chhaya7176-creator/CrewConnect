"""Backend tests for the updated company flow (iteration 15):
- 5 free contact unlocks, then INR 29 paid unlock
- INR 1,99,000/yr subscription grants unlimited unlocks, 20 CV downloads/day, banner
- Standard CV PDF download (application/pdf, subscribed only, 20/day)
- ProviderRequirement persists vessel_name / port / audits
- Seeker contact redaction in /matches and /browse until unlocked
"""
import os
import time
import uuid
import random
import requests
import pytest

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    # fallback: read from frontend/.env (test-only convenience)
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except FileNotFoundError:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"


def _rand_mobile():
    # 10-digit mobile with +91 prefix to keep it unique-ish
    return f"+919{random.randint(100000000, 999999999)}"


def _auth(role: str) -> dict:
    """Create a fresh account with the given role and return {token, user, mobile}."""
    mobile = _rand_mobile()
    r = requests.post(f"{API}/auth/request-otp", json={"mobile": mobile, "role": role})
    assert r.status_code == 200, r.text
    r = requests.post(f"{API}/auth/verify-otp",
                      json={"mobile": mobile, "otp": "123456", "role": role,
                            "dob": "1990-01-01", "consent": True})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["token"], "user": data["user"], "mobile": mobile,
            "headers": {"Authorization": f"Bearer {data['token']}"}}


def _make_seeker(name_suffix: str = "") -> dict:
    """Create seeker account + matching profile (Chief Engineer / Bulk Carrier / 30+ mo / India)."""
    acc = _auth("seeker")
    payload = {
        "rank": "Chief Engineer",
        "vessel_type": "Bulk Carrier",
        "sea_time": "30+ months",
        "coc": "India",
        "us_visa": "Yes",
        "other_visa": "",
        "mobile": acc["mobile"],
        "consent": True,
        "name": f"TEST_Seeker_{name_suffix or uuid.uuid4().hex[:6]}",
        "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
        "availability": "Immediate",
        "summary": "Auto test seeker",
    }
    r = requests.post(f"{API}/seeker/profile", json=payload, headers=acc["headers"])
    assert r.status_code == 200, r.text
    acc["profile"] = r.json()
    return acc


def _make_company() -> dict:
    """Create company (provider) account + a matching requirement."""
    acc = _auth("provider")
    payload = {
        "rank": "Chief Engineer",
        "vessel_type": "Bulk Carrier",
        "sea_time": "30+ months",
        "coc": ["India"],
        "us_visa": "Yes",
        "mobile": acc["mobile"],
        "consent": True,
        "company_name": f"TEST_Co_{uuid.uuid4().hex[:6]}",
        "email": f"co_{uuid.uuid4().hex[:6]}@ex.com",
        "availability": "Immediate",
        "summary": "Auto test co",
    }
    r = requests.post(f"{API}/provider/requirement", json=payload, headers=acc["headers"])
    assert r.status_code == 200, r.text
    acc["requirement"] = r.json()
    return acc


# --------------------------------------------------------------------------- #
# 1) Company status endpoint returns the new pricing constants
# --------------------------------------------------------------------------- #
def test_company_status_defaults():
    co = _make_company()
    r = requests.get(f"{API}/company/status", headers=co["headers"])
    assert r.status_code == 200, r.text
    s = r.json()
    assert s["subscribed"] is False
    assert s["free_unlocks_left"] == 5
    assert s["unlock_price"] == 29
    assert s["subscription_price"] == 199000
    assert s["downloads_today"] == 0
    assert s["download_limit"] == 20


# --------------------------------------------------------------------------- #
# 2) 5 free unlocks, then 6th requires payment (needs_payment=true amount=29)
# --------------------------------------------------------------------------- #
def test_five_free_then_paid_unlock():
    co = _make_company()
    # Create 6 seekers
    seekers = [_make_seeker(str(i)) for i in range(6)]
    # First 5 unlocks should be free
    for i, s in enumerate(seekers[:5]):
        r = requests.post(f"{API}/unlock-cv", json={"seeker_id": s["profile"]["id"]},
                          headers=co["headers"])
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["amount"] == 0
        assert body.get("free") is True
        assert body["free_unlocks_left"] == 4 - i
        # Locked contact returned unlocked here
        cv = body["cv"]
        assert cv.get("name") and cv.get("name") != "Locked"

    # 6th unlock -> needs payment
    r = requests.post(f"{API}/unlock-cv", json={"seeker_id": seekers[5]["profile"]["id"]},
                      headers=co["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is False
    assert body["needs_payment"] is True
    assert body["amount"] == 29
    assert body["free_unlocks_left"] == 0


# --------------------------------------------------------------------------- #
# 3) Paid unlock via mock Razorpay flow
# --------------------------------------------------------------------------- #
def test_paid_unlock_via_mock_flow():
    co = _make_company()
    # exhaust 5 free
    for _ in range(5):
        r = requests.post(f"{API}/unlock-cv",
                          json={"seeker_id": _make_seeker()["profile"]["id"]},
                          headers=co["headers"])
        assert r.status_code == 200
    target = _make_seeker()
    # 1) create-order
    r = requests.post(f"{API}/pay/create-order",
                      json={"purpose": "cv_unlock", "seeker_id": target["profile"]["id"]},
                      headers=co["headers"])
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["amount"] == 29
    assert order["mock"] is True
    assert order["order_id"].startswith("order_mock_")
    # 2) verify -> completes unlock
    r = requests.post(f"{API}/pay/verify",
                      json={"order_id": order["order_id"], "purpose": "cv_unlock",
                            "seeker_id": target["profile"]["id"]},
                      headers=co["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["purpose"] == "cv_unlock"
    assert body["amount"] == 29
    assert body["cv"]["name"] == target["profile"]["name"]

    # Subsequent /unlock-cv for same seeker returns already-unlocked
    r = requests.post(f"{API}/unlock-cv",
                      json={"seeker_id": target["profile"]["id"]},
                      headers=co["headers"])
    assert r.status_code == 200 and r.json().get("already") is True


# --------------------------------------------------------------------------- #
# 4) Subscription: after verify, unlocks are free & status shows subscribed
# --------------------------------------------------------------------------- #
def test_subscription_flow_and_unlimited_unlocks():
    co = _make_company()
    # exhaust free tier
    for _ in range(5):
        requests.post(f"{API}/unlock-cv",
                      json={"seeker_id": _make_seeker()["profile"]["id"]},
                      headers=co["headers"])
    # Create subscription order
    r = requests.post(f"{API}/pay/create-order", json={"purpose": "subscription"},
                      headers=co["headers"])
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["amount"] == 199000 and order["mock"] is True
    r = requests.post(f"{API}/pay/verify",
                      json={"order_id": order["order_id"], "purpose": "subscription"},
                      headers=co["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True and body["purpose"] == "subscription"
    assert body["amount"] == 199000
    assert "subscription_expiry" in body

    # status flips to subscribed
    r = requests.get(f"{API}/company/status", headers=co["headers"])
    s = r.json()
    assert s["subscribed"] is True
    assert s["subscription_expiry"]

    # Post-subscribe unlock is free (no needs_payment)
    tgt = _make_seeker()
    r = requests.post(f"{API}/unlock-cv",
                      json={"seeker_id": tgt["profile"]["id"]},
                      headers=co["headers"])
    body = r.json()
    assert body["success"] is True and body["amount"] == 0


# --------------------------------------------------------------------------- #
# 5) Banner: 403 unless subscribed, then listed by /banners
# --------------------------------------------------------------------------- #
def test_banner_requires_subscription_then_listed():
    co = _make_company()
    # unsubscribed -> 403
    r = requests.post(f"{API}/company/banner",
                      json={"title": "TEST Banner", "tagline": "hi", "image_url": ""},
                      headers=co["headers"])
    assert r.status_code == 403

    # Subscribe
    order = requests.post(f"{API}/pay/create-order", json={"purpose": "subscription"},
                          headers=co["headers"]).json()
    requests.post(f"{API}/pay/verify",
                  json={"order_id": order["order_id"], "purpose": "subscription"},
                  headers=co["headers"])

    # now allowed
    title = f"TEST_Banner_{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/company/banner",
                      json={"title": title, "tagline": "we hire", "image_url": ""},
                      headers=co["headers"])
    assert r.status_code == 200, r.text

    # Listed publicly
    r = requests.get(f"{API}/banners")
    assert r.status_code == 200
    banners = r.json()["banners"]
    assert any(b.get("title") == title for b in banners), banners


# --------------------------------------------------------------------------- #
# 6) Standard CV PDF download — 403 unsub, 200 sub with application/pdf
# --------------------------------------------------------------------------- #
def test_cv_download_requires_subscription_and_returns_pdf():
    co = _make_company()
    target = _make_seeker()
    # unsubscribed -> 403
    r = requests.get(f"{API}/cv/{target['profile']['id']}/download",
                     headers=co["headers"])
    assert r.status_code == 403

    # Subscribe
    order = requests.post(f"{API}/pay/create-order", json={"purpose": "subscription"},
                          headers=co["headers"]).json()
    requests.post(f"{API}/pay/verify",
                  json={"order_id": order["order_id"], "purpose": "subscription"},
                  headers=co["headers"])

    # Download works
    r = requests.get(f"{API}/cv/{target['profile']['id']}/download",
                     headers=co["headers"])
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content.startswith(b"%PDF"), "response is not a PDF"

    # downloads_today increments
    s = requests.get(f"{API}/company/status", headers=co["headers"]).json()
    assert s["downloads_today"] >= 1
    assert s["download_limit"] == 20


# --------------------------------------------------------------------------- #
# 7) Provider requirement persists vessel_name / port / audits and /matches surfaces them
# --------------------------------------------------------------------------- #
def test_provider_requirement_persists_vessel_port_audits():
    co = _make_company()
    req_id = co["requirement"]["id"]
    updated = {
        "rank": "Chief Engineer",
        "vessel_type": "Bulk Carrier",
        "sea_time": "30+ months",
        "coc": ["India"],
        "us_visa": "Yes",
        "mobile": co["mobile"],
        "consent": True,
        "company_name": co["requirement"]["company_name"],
        "email": co["requirement"]["email"],
        "availability": "Immediate",
        "summary": "updated",
        "vessel_name": "MV TEST HORIZON",
        "port": "Mumbai",
        "audits": [
            {"type": "ISPS", "date": "2026-02-14"},
            {"type": "SIRE", "date": "2026-03-01"},
        ],
    }
    r = requests.put(f"{API}/provider/requirement/{req_id}", json=updated,
                     headers=co["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["vessel_name"] == "MV TEST HORIZON"
    assert body["port"] == "Mumbai"
    assert isinstance(body["audits"], list) and len(body["audits"]) == 2
    assert body["audits"][0]["type"] == "ISPS"

    # Company /matches echoes the (updated) requirement doc
    r = requests.get(f"{API}/matches", headers=co["headers"])
    assert r.status_code == 200, r.text
    req_echo = r.json().get("requirement") or {}
    assert req_echo.get("vessel_name") == "MV TEST HORIZON"
    assert req_echo.get("port") == "Mumbai"
    assert len(req_echo.get("audits") or []) == 2

    # Seeker-side /matches: provider_card currently DOES NOT expose vessel_name/port/audits.
    # Flag this as a bug — the review request expects these fields to be surfaced to seekers.
    seeker = _make_seeker()
    r = requests.get(f"{API}/matches", headers=seeker["headers"])
    data = r.json()
    ours = next((x for x in data.get("matches", []) if x.get("id") == req_id), None)
    # This assertion is expected to fail if the bug is unfixed — kept to surface it clearly.
    if ours is not None:
        assert ours.get("vessel_name") == "MV TEST HORIZON", (
            "provider_card() omits vessel_name — seekers cannot see it on /matches")
        assert ours.get("port") == "Mumbai", "provider_card() omits port"
        assert isinstance(ours.get("audits"), list), "provider_card() omits audits"


# --------------------------------------------------------------------------- #
# 8) Seeker contacts redacted in /matches and /browse until unlocked
# --------------------------------------------------------------------------- #
def test_seeker_contacts_redacted_until_unlocked():
    co = _make_company()
    seeker = _make_seeker()
    sid = seeker["profile"]["id"]

    # /matches from the company side
    r = requests.get(f"{API}/matches", headers=co["headers"])
    assert r.status_code == 200
    results = r.json().get("matches", [])
    ours = next((row for row in results if row.get("id") == sid), None)
    assert ours, "our seeker not in company /matches"
    LOCKED = ("Locked", "🔒 Locked", None)
    assert ours.get("name") in LOCKED
    assert ours.get("mobile") in LOCKED
    assert ours.get("email") in LOCKED
    assert ours.get("unlocked") is False

    # /browse: locked too
    r = requests.get(f"{API}/browse?rank=Chief%20Engineer", headers=co["headers"])
    if r.status_code == 200:
        rows = r.json().get("matches", []) or r.json().get("results", [])
        for row in rows:
            if row.get("id") == sid:
                assert row.get("name") in LOCKED
                assert row.get("mobile") in LOCKED
                break

    # Unlock (free) then confirm name/mobile/email are revealed
    r = requests.post(f"{API}/unlock-cv", json={"seeker_id": sid}, headers=co["headers"])
    assert r.status_code == 200
    cv = r.json()["cv"]
    assert cv["name"] == seeker["profile"]["name"]
    assert cv["mobile"] and cv["mobile"] != "Locked"
    assert cv["email"] and cv["email"] != "Locked"
