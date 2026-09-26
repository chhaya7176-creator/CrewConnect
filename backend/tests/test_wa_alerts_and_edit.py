"""
Backend tests for iteration 14:
1) Twilio WhatsApp company alerts in DEMO mode (gating, dedupe, trigger A/B)
2) PUT /seeker/profile/{id} and PUT /provider/requirement/{id} edit endpoints
3) Referral self-signup gate + auto-unlock at SIGNUP_TARGET=2
"""
import os
import time
import uuid
import requests
import pytest

def _load_frontend_env():
    p = "/app/frontend/.env"
    if os.path.exists(p):
        for line in open(p):
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"')
    return os.environ.get("REACT_APP_BACKEND_URL", "")


BASE_URL = _load_frontend_env().rstrip("/") + "/api"
assert BASE_URL.startswith("http"), f"Bad BASE_URL: {BASE_URL}"


def rand_mobile(prefix="+9199"):
    return prefix + str(int(time.time() * 1000))[-8:] + str(uuid.uuid4().int)[:0]


def _mobile():
    # 10 digit unique india mobile
    n = uuid.uuid4().int
    return "+91" + str(9000000000 + (n % 999999999))[:10]


def auth(mobile, role=None, ref=None):
    r = requests.post(f"{BASE_URL}/auth/request-otp", json={"mobile": mobile})
    assert r.status_code == 200, r.text
    payload = {"mobile": mobile, "otp": "123456"}
    if role:
        payload["role"] = role
    if ref:
        payload["ref"] = ref
    r = requests.post(f"{BASE_URL}/auth/verify-otp", json=payload)
    assert r.status_code == 200, r.text
    return r.json()  # {token, user}


def hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


SEEKER_PAYLOAD = {
    "rank": "Chief Engineer",
    "vessel_type": "Bulk Carrier",
    "sea_time": "30+ months",
    "coc": "India",
    "us_visa": "Yes",
    "mobile": "",  # filled per-test
    "consent": True,
    "name": "Test Seeker",
    "email": "test.seeker@example.com",
    "availability": "Immediate",
    "summary": "",
}

PROVIDER_PAYLOAD = {
    "rank": "Chief Engineer",
    "vessel_type": "Bulk Carrier",
    "sea_time": "18–30 months",
    "coc": ["India"],
    "us_visa": "Preferred",
    "mobile": "",
    "consent": True,
    "company_name": "Test Shipping Co",
    "email": "co@example.com",
    "availability": "Immediate",
    "summary": "",
}


def create_seeker(tok, mobile, **overrides):
    body = {**SEEKER_PAYLOAD, "mobile": mobile, **overrides}
    r = requests.post(f"{BASE_URL}/seeker/profile", headers=hdr(tok), json=body)
    assert r.status_code == 200, r.text
    return r.json()


def create_provider(tok, mobile, **overrides):
    body = {**PROVIDER_PAYLOAD, "mobile": mobile, **overrides}
    r = requests.post(f"{BASE_URL}/provider/requirement", headers=hdr(tok), json=body)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Feature 1: WhatsApp alert gating & triggers ----------

class TestWhatsAppAlerts:

    def test_non_paying_company_receives_no_alert_on_seeker_boost(self):
        # provider (not paying) + seeker who then boosts
        s_mobile = _mobile()
        p_mobile = _mobile()
        s = auth(s_mobile, "seeker")
        p = auth(p_mobile, "provider")
        seeker = create_seeker(s["token"], s_mobile)
        provider = create_provider(p["token"], p_mobile)

        # Seeker boosts via get-noticed/pay
        r = requests.post(f"{BASE_URL}/get-noticed/pay", headers=hdr(s["token"]))
        assert r.status_code == 200, r.text

        # Provider (non-paying) checks alerts -> empty
        r = requests.get(f"{BASE_URL}/wa-alerts", headers=hdr(p["token"]))
        assert r.status_code == 200
        data = r.json()
        assert data["demo"] is True
        # No alerts for this new company_user_id
        assert data["alerts"] == [], f"Expected no alerts, got {data['alerts']}"

    def test_alert_created_after_unlock_cv_trigger_B(self):
        s_mobile = _mobile()
        p_mobile = _mobile()
        s = auth(s_mobile, "seeker")
        p = auth(p_mobile, "provider")
        seeker = create_seeker(s["token"], s_mobile)
        provider = create_provider(p["token"], p_mobile)
        # boost seeker
        r = requests.post(f"{BASE_URL}/get-noticed/pay", headers=hdr(s["token"]))
        assert r.status_code == 200

        # Company unlocks matching seeker CV -> becomes paying + trigger B
        r = requests.post(f"{BASE_URL}/unlock-cv", headers=hdr(p["token"]),
                          json={"seeker_id": seeker["id"]})
        assert r.status_code == 200, r.text

        r = requests.get(f"{BASE_URL}/wa-alerts", headers=hdr(p["token"]))
        assert r.status_code == 200
        data = r.json()
        assert data["demo"] is True
        alerts = [a for a in data["alerts"] if a["seeker_id"] == seeker["id"]]
        assert len(alerts) == 1, f"Expected exactly 1 alert for this seeker, got {alerts}"
        a = alerts[0]
        assert a["kind"] == "matching_crew"
        assert a["status"] == "simulated"
        assert a["mode"] == "demo"
        assert a["rank"] == "Chief Engineer"
        assert a["to"].startswith("+"), f"'to' must be E.164 (starts with +): {a['to']}"
        assert a["message"] == "A new matching Chief Engineer is available on Smart Crewing."
        assert a["seeker_id"] == seeker["id"]

    def test_trigger_A_seeker_boost_after_company_paying(self):
        # Company becomes paying FIRST (subscribed via unlock of dummy), then a new seeker boosts
        s_mobile = _mobile()
        p_mobile = _mobile()
        # Create a paying company by unlocking a first (non-matching) seeker
        s0_mobile = _mobile()
        s0 = auth(s0_mobile, "seeker")
        s0_profile = create_seeker(s0["token"], s0_mobile, rank="Master",
                                   vessel_type="Tanker")  # non-matching rank

        p = auth(p_mobile, "provider")
        create_provider(p["token"], p_mobile)
        # unlock that non-matching seeker to become "paying"
        r = requests.post(f"{BASE_URL}/unlock-cv", headers=hdr(p["token"]),
                          json={"seeker_id": s0_profile["id"]})
        assert r.status_code == 200

        # Alerts still empty (no matching boosted crew yet)
        r = requests.get(f"{BASE_URL}/wa-alerts", headers=hdr(p["token"]))
        prev = len(r.json()["alerts"])

        # Now a matching seeker boosts
        s = auth(s_mobile, "seeker")
        seeker = create_seeker(s["token"], s_mobile)
        r = requests.post(f"{BASE_URL}/get-noticed/pay", headers=hdr(s["token"]))
        assert r.status_code == 200

        r = requests.get(f"{BASE_URL}/wa-alerts", headers=hdr(p["token"]))
        alerts = r.json()["alerts"]
        # Exactly one new alert for the matching seeker
        matched = [a for a in alerts if a["seeker_id"] == seeker["id"]]
        assert len(matched) == 1, f"Trigger A failed: alerts={alerts}"
        assert matched[0]["status"] == "simulated"
        assert matched[0]["mode"] == "demo"
        assert matched[0]["to"].startswith("+")

    def test_dedupe_per_company_seeker(self):
        s_mobile = _mobile()
        p_mobile = _mobile()
        s = auth(s_mobile, "seeker")
        p = auth(p_mobile, "provider")
        seeker = create_seeker(s["token"], s_mobile)
        create_provider(p["token"], p_mobile)
        requests.post(f"{BASE_URL}/get-noticed/pay", headers=hdr(s["token"]))
        # Unlock (paying + trigger B alert)
        requests.post(f"{BASE_URL}/unlock-cv", headers=hdr(p["token"]),
                      json={"seeker_id": seeker["id"]})
        # Re-trigger: seeker boosts again (idempotent) + company posts another matching req
        requests.post(f"{BASE_URL}/get-noticed/pay", headers=hdr(s["token"]))
        create_provider(p["token"], p_mobile)  # posts another matching requirement

        r = requests.get(f"{BASE_URL}/wa-alerts", headers=hdr(p["token"]))
        alerts = [a for a in r.json()["alerts"] if a["seeker_id"] == seeker["id"]]
        assert len(alerts) == 1, f"Dedupe failed, got {len(alerts)} rows: {alerts}"


# ---------- Feature 2: Edit endpoints ----------

class TestEditEndpoints:

    def test_put_seeker_profile_preserves_boosted(self):
        s_mobile = _mobile()
        s = auth(s_mobile, "seeker")
        seeker = create_seeker(s["token"], s_mobile)
        # Boost
        r = requests.post(f"{BASE_URL}/get-noticed/pay", headers=hdr(s["token"]))
        assert r.status_code == 200

        # Edit: send boosted=false in payload -> backend must ignore and preserve
        updated = {**SEEKER_PAYLOAD, "mobile": s_mobile,
                   "name": "Edited Name", "email": "edited@example.com",
                   "rank": "2nd Engineer", "vessel_type": "Container",
                   "sea_time": "18–30 months", "coc": "UK",
                   "us_visa": "No", "availability": "1 month",
                   "boosted": False}
        r = requests.put(f"{BASE_URL}/seeker/profile/{seeker['id']}",
                         headers=hdr(s["token"]), json=updated)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["name"] == "Edited Name"
        assert doc["email"] == "edited@example.com"
        assert doc["rank"] == "2nd Engineer"
        assert doc["vessel_type"] == "Container"
        assert doc["sea_time"] == "18–30 months"
        assert doc["coc"] == "UK"
        assert doc["us_visa"] == "No"
        assert doc["availability"] == "1 month"
        assert doc["boosted"] is True, "boosted flag must be preserved after edit"

    def test_put_provider_updates_fields(self):
        p_mobile = _mobile()
        p = auth(p_mobile, "provider")
        prov = create_provider(p["token"], p_mobile)
        updated = {**PROVIDER_PAYLOAD, "mobile": p_mobile,
                   "company_name": "Edited Co", "rank": "Master",
                   "vessel_type": "Tanker", "sea_time": "30+ months",
                   "coc": ["UK", "India"], "us_visa": "Mandatory",
                   "email": "new@co.com", "availability": "Immediate"}
        r = requests.put(f"{BASE_URL}/provider/requirement/{prov['id']}",
                         headers=hdr(p["token"]), json=updated)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["company_name"] == "Edited Co"
        assert doc["rank"] == "Master"
        assert doc["vessel_type"] == "Tanker"
        assert doc["coc"] == ["UK", "India"]
        assert doc["email"] == "new@co.com"

    def test_edit_not_owned_returns_404_seeker(self):
        # user A creates seeker; user B tries to edit
        a_mobile = _mobile()
        b_mobile = _mobile()
        a = auth(a_mobile, "seeker")
        b = auth(b_mobile, "seeker")
        seeker_a = create_seeker(a["token"], a_mobile)
        body = {**SEEKER_PAYLOAD, "mobile": b_mobile, "name": "Hacker"}
        r = requests.put(f"{BASE_URL}/seeker/profile/{seeker_a['id']}",
                         headers=hdr(b["token"]), json=body)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_edit_not_owned_returns_404_provider(self):
        a_mobile = _mobile()
        b_mobile = _mobile()
        a = auth(a_mobile, "provider")
        b = auth(b_mobile, "provider")
        prov_a = create_provider(a["token"], a_mobile)
        body = {**PROVIDER_PAYLOAD, "mobile": b_mobile, "company_name": "Steal"}
        r = requests.put(f"{BASE_URL}/provider/requirement/{prov_a['id']}",
                         headers=hdr(b["token"]), json=body)
        assert r.status_code == 404


# ---------- Feature 3: Referral regression ----------

class TestReferralRegression:

    def test_self_referral_does_not_count(self):
        m = _mobile()
        user = auth(m, "seeker")
        seeker = create_seeker(user["token"], m)
        ref_code = seeker["referral_code"]

        # Same user re-signs (verify-otp on same mobile) passing their own ref
        r = requests.post(f"{BASE_URL}/auth/request-otp", json={"mobile": m})
        assert r.status_code == 200
        r = requests.post(f"{BASE_URL}/auth/verify-otp",
                          json={"mobile": m, "otp": "123456", "role": "seeker", "ref": ref_code})
        assert r.status_code == 200

        r = requests.get(f"{BASE_URL}/eligibility", headers=hdr(user["token"]))
        elig = r.json()
        assert elig["ref_signups"] == 0, f"Self-ref should not count, got {elig}"
        assert elig["ref_completed"] is False

    def test_two_real_signups_auto_unlock(self):
        # referrer
        m = _mobile()
        referrer = auth(m, "seeker")
        seeker = create_seeker(referrer["token"], m)
        ref_code = seeker["referral_code"]

        # 2 fresh signups
        for _ in range(2):
            nm = _mobile()
            auth(nm, "seeker", ref=ref_code)

        r = requests.get(f"{BASE_URL}/eligibility", headers=hdr(referrer["token"]))
        assert r.status_code == 200
        elig = r.json()
        assert elig["ref_signups"] >= 2, elig
        assert elig["ref_completed"] is True, elig
        assert elig["eligible"] is True, elig
