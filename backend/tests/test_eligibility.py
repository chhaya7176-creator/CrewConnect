"""Tests for seeker eligibility gating, referral, registration payment,
company CV unlock (Rs.49) and storage limits (per-file 5MB, crew 100MB / company 5MB)."""
import io
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/") + "/api"
OTP = "123456"


def _login(mobile):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/auth/request-otp", json={"mobile": mobile}, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json().get("demo_otp") == OTP
    r = s.post(f"{BASE_URL}/auth/verify-otp", json={"mobile": mobile, "otp": OTP}, timeout=30)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _fresh_mobile(prefix="+9198"):
    return prefix + str(uuid.uuid4().int)[:8]


SEEKER_PAYLOAD = {
    "rank": "Chief Engineer", "vessel_type": "Oil Tanker", "sea_time": "3-5 years",
    "coc": "India", "us_visa": "Yes (C1/D valid)", "mobile": "", "consent": True,
    "name": "TEST Seeker", "email": "test_seeker@example.test", "availability": "Immediate",
    "summary": "TEST summary",
}

PROVIDER_PAYLOAD = {
    "rank": "Chief Engineer", "vessel_type": "Oil Tanker", "sea_time": "3-5 years",
    "coc": ["India"], "us_visa": "Preferred", "mobile": "+919000000001", "consent": True,
    "company_name": "TEST Shipping Co", "email": "test_company@example.test",
    "availability": "Immediate", "summary": "TEST req",
}


@pytest.fixture(scope="module")
def seeker_session():
    """Fresh seeker (not eligible) with a Chief Engineer / Oil Tanker profile."""
    m = _fresh_mobile()
    s = _login(m)
    payload = dict(SEEKER_PAYLOAD, mobile=m)
    r = s.post(f"{BASE_URL}/seeker/profile", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def provider_session():
    m = _fresh_mobile("+9197")
    s = _login(m)
    r = s.post(f"{BASE_URL}/provider/requirement", json=dict(PROVIDER_PAYLOAD, mobile=m), timeout=30)
    assert r.status_code == 200, r.text
    return s


# ---------------- Eligibility / referral ----------------
class TestEligibility:
    def test_eligibility_initial_state(self, seeker_session):
        r = seeker_session.get(f"{BASE_URL}/eligibility", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["eligible"] is False
        assert d["reg_paid"] is False and d["ref_completed"] is False
        assert d["group_shares"] == 0 and d["contact_shares"] == 0

    def test_eligibility_requires_auth(self):
        r = requests.get(f"{BASE_URL}/eligibility", timeout=30)
        assert r.status_code == 401

    def test_matches_locked_before_eligible(self, seeker_session, provider_session):
        r = seeker_session.get(f"{BASE_URL}/matches", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "seeker"
        assert d["eligible"] is False
        assert len(d["matches"]) >= 1, "expected at least one matching vacancy"
        for m in d["matches"]:
            assert m["company_name"] == "\U0001f512 Locked"
            assert m["company_mobile"] == ""
            assert m["company_email"] == ""
            # non-identity suitability details still visible
            assert m["rank"] and m["vessel_type"] and m["sea_time"]
        assert "referral_code" in d["profile"]

    def test_claim_fails_without_shares(self, seeker_session):
        r = seeker_session.post(f"{BASE_URL}/referral/claim", timeout=30)
        assert r.status_code == 400, r.text
        assert "2 groups" in r.json()["detail"]

    def test_share_increments_and_claim_after_two_groups(self, seeker_session):
        r = seeker_session.post(f"{BASE_URL}/referral/share", json={"type": "group"}, timeout=30)
        assert r.status_code == 200 and r.json()["group_shares"] == 1
        # still not enough
        assert seeker_session.post(f"{BASE_URL}/referral/claim", timeout=30).status_code == 400
        r = seeker_session.post(f"{BASE_URL}/referral/share", json={"type": "group"}, timeout=30)
        assert r.json()["group_shares"] == 2
        r = seeker_session.post(f"{BASE_URL}/referral/claim", timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["ref_completed"] is True
        # persisted
        e = seeker_session.get(f"{BASE_URL}/eligibility", timeout=30).json()
        assert e["eligible"] is True and e["ref_completed"] is True

    def test_matches_revealed_after_claim(self, seeker_session):
        d = seeker_session.get(f"{BASE_URL}/matches", timeout=30).json()
        assert d["eligible"] is True
        assert len(d["matches"]) >= 1
        found = [m for m in d["matches"] if m["company_name"] == "TEST Shipping Co"]
        assert found, [m["company_name"] for m in d["matches"]]
        assert found[0]["company_mobile"]
        assert found[0]["company_email"] == "test_company@example.test"

    def test_contact_shares_path_needs_ten(self):
        m = _fresh_mobile()
        s = _login(m)
        s.post(f"{BASE_URL}/seeker/profile", json=dict(SEEKER_PAYLOAD, mobile=m), timeout=30)
        for i in range(9):
            s.post(f"{BASE_URL}/referral/share", json={"type": "contact"}, timeout=30)
        assert s.post(f"{BASE_URL}/referral/claim", timeout=30).status_code == 400
        r = s.post(f"{BASE_URL}/referral/share", json={"type": "contact"}, timeout=30)
        assert r.json()["contact_shares"] == 10
        assert s.post(f"{BASE_URL}/referral/claim", timeout=30).status_code == 200

    def test_register_pay_makes_eligible(self):
        m = _fresh_mobile()
        s = _login(m)
        s.post(f"{BASE_URL}/seeker/profile", json=dict(SEEKER_PAYLOAD, mobile=m), timeout=30)
        assert s.get(f"{BASE_URL}/matches", timeout=30).json()["eligible"] is False
        r = s.post(f"{BASE_URL}/register/pay", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["amount"] == 100 and d["reg_paid"] is True
        assert s.get(f"{BASE_URL}/eligibility", timeout=30).json()["eligible"] is True
        md = s.get(f"{BASE_URL}/matches", timeout=30).json()
        assert md["eligible"] is True
        assert all(m2["company_name"] != "\U0001f512 Locked" for m2 in md["matches"])


# ---------------- Company unlock ----------------
class TestCompanyUnlock:
    def test_provider_matches_locked_identity(self, provider_session, seeker_session):
        d = provider_session.get(f"{BASE_URL}/matches", timeout=30).json()
        assert d["role"] == "provider"
        assert len(d["matches"]) >= 1
        locked = [c for c in d["matches"] if not c["unlocked"]]
        assert locked, "expected at least one locked candidate"
        c = locked[0]
        assert c["name"] == "\U0001f512 Locked"
        assert c["mobile"] == "\U0001f512 Locked" and c["email"] == "\U0001f512 Locked"
        assert c["rank"] and c["vessel_type"] and c["sea_time"]

    def test_unlock_cv_amount_49_and_reveals(self, provider_session):
        d = provider_session.get(f"{BASE_URL}/matches", timeout=30).json()
        target = [c for c in d["matches"] if not c["unlocked"]][0]
        r = provider_session.post(f"{BASE_URL}/unlock-cv", json={"seeker_id": target["id"]}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["amount"] == 49
        cv = body["cv"]
        assert cv["unlocked"] is True
        assert cv["name"] != "\U0001f512 Locked" and cv["mobile"] != "\U0001f512 Locked"
        # persisted in matches
        d2 = provider_session.get(f"{BASE_URL}/matches", timeout=30).json()
        same = [c for c in d2["matches"] if c["id"] == target["id"]][0]
        assert same["unlocked"] is True
        assert same["name"] == cv["name"]

    def test_unlock_unknown_seeker_404(self, provider_session):
        r = provider_session.post(f"{BASE_URL}/unlock-cv", json={"seeker_id": "does-not-exist"}, timeout=30)
        assert r.status_code == 404


# ---------------- Storage limits ----------------
class TestStorage:
    def test_usage_user_type_crew(self, seeker_session):
        r = seeker_session.get(f"{BASE_URL}/documents/usage", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user_type"] == "crew"
        assert d["limit"] == 100 * 1024 * 1024
        assert d["remaining"] == d["limit"] - d["used"]

    def test_usage_user_type_company(self, provider_session):
        d = provider_session.get(f"{BASE_URL}/documents/usage", timeout=30).json()
        assert d["user_type"] == "company"
        assert d["limit"] == 5 * 1024 * 1024

    def test_per_file_cap_5mb(self, seeker_session):
        big = io.BytesIO(b"x" * (5 * 1024 * 1024 + 1024))
        r = seeker_session.post(
            f"{BASE_URL}/documents?category=Other",
            files={"file": ("TEST_big.pdf", big, "application/pdf")}, timeout=120,
        )
        assert r.status_code == 400, r.text
        assert "5 MB" in r.json()["detail"]

    def test_small_upload_ok_and_cleanup(self, seeker_session):
        r = seeker_session.post(
            f"{BASE_URL}/documents?category=Other",
            files={"file": ("TEST_small.txt", io.BytesIO(b"hello world"), "text/plain")}, timeout=60,
        )
        assert r.status_code == 200, r.text
        doc = r.json()
        assert "_id" not in doc
        assert doc["size"] == 11 and doc["original_filename"] == "TEST_small.txt"
        usage = seeker_session.get(f"{BASE_URL}/documents/usage", timeout=30).json()
        assert usage["used"] >= 11
        assert seeker_session.delete(f"{BASE_URL}/documents/{doc['id']}", timeout=30).status_code == 200

    def test_company_total_limit_5mb(self, provider_session):
        """Company total cap is 5MB: two ~3MB files -> second must fail."""
        ids = []
        blob = b"y" * (3 * 1024 * 1024)
        r1 = provider_session.post(
            f"{BASE_URL}/documents?category=Other",
            files={"file": ("TEST_c1.pdf", io.BytesIO(blob), "application/pdf")}, timeout=120)
        assert r1.status_code == 200, r1.text
        ids.append(r1.json()["id"])
        r2 = provider_session.post(
            f"{BASE_URL}/documents?category=Other",
            files={"file": ("TEST_c2.pdf", io.BytesIO(blob), "application/pdf")}, timeout=120)
        try:
            assert r2.status_code == 400, r2.text
            assert "Storage limit of 5 MB" in r2.json()["detail"]
        finally:
            if r2.status_code == 200:
                ids.append(r2.json()["id"])
            for i in ids:
                provider_session.delete(f"{BASE_URL}/documents/{i}", timeout=30)


# ---------------- Demo accounts referenced by the frontend tests ----------------
class TestDemoAccounts:
    def test_demo_seeker_not_eligible_has_matches(self):
        s = _login("+919555000111")
        d = s.get(f"{BASE_URL}/matches", timeout=30).json()
        assert d["role"] == "seeker", d
        assert d["eligible"] is False, "demo seeker +919555000111 should start NOT eligible"
        assert len(d["matches"]) >= 1

    def test_demo_company_has_locked_candidates(self):
        s = _login("+15559998888")
        d = s.get(f"{BASE_URL}/matches", timeout=30).json()
        assert d["role"] == "provider", d
        assert len(d["matches"]) >= 1
        assert any(not c["unlocked"] for c in d["matches"]), "expected a locked candidate for demo company"

    def test_demo_eligible_seeker_revealed(self):
        s = _login("+919777001122")
        d = s.get(f"{BASE_URL}/matches", timeout=30).json()
        assert d["role"] == "seeker", d
        assert d["eligible"] is True
        assert all(m["company_name"] != "\U0001f512 Locked" for m in d["matches"])
