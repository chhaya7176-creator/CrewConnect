"""Backend API tests for Maritime Connect."""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://maritime-hub-44.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _mobile():
    return f"+1555{int(time.time()*1000) % 10000000:07d}"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def seeker_auth(s):
    m = _mobile()
    r = s.post(f"{API}/auth/request-otp", json={"mobile": m})
    assert r.status_code == 200 and r.json()["demo_otp"] == "123456"
    r = s.post(f"{API}/auth/verify-otp", json={"mobile": m, "otp": "123456"})
    assert r.status_code == 200
    return r.json()["token"], r.json()["user"], m


@pytest.fixture(scope="module")
def provider_auth(s):
    m = _mobile() + "1"
    s.post(f"{API}/auth/request-otp", json={"mobile": m})
    r = s.post(f"{API}/auth/verify-otp", json={"mobile": m, "otp": "123456"})
    assert r.status_code == 200
    return r.json()["token"], r.json()["user"], m


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---- Config ----
def test_config(s):
    r = s.get(f"{API}/config")
    assert r.status_code == 200
    d = r.json()
    for k in ["ranks", "vessel_types", "sea_time", "coc_seeker", "coc_provider", "us_visa_seeker", "us_visa_provider"]:
        assert k in d and isinstance(d[k], list) and len(d[k]) > 0


# ---- Auth ----
def test_request_otp_valid(s):
    r = s.post(f"{API}/auth/request-otp", json={"mobile": "+919812345670"})
    assert r.status_code == 200
    assert r.json()["demo_otp"] == "123456"


def test_request_otp_invalid(s):
    r = s.post(f"{API}/auth/request-otp", json={"mobile": "123"})
    assert r.status_code == 400


def test_verify_otp_invalid(s):
    m = _mobile()
    s.post(f"{API}/auth/request-otp", json={"mobile": m})
    r = s.post(f"{API}/auth/verify-otp", json={"mobile": m, "otp": "000000"})
    assert r.status_code == 400


def test_me(s, seeker_auth):
    tok, user, m = seeker_auth
    r = s.get(f"{API}/auth/me", headers=_h(tok))
    assert r.status_code == 200
    assert r.json()["mobile"] == m


def test_me_no_auth(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---- AI summary ----
def test_ai_summary_seeker(s):
    r = s.post(f"{API}/ai/summary", json={"role": "seeker", "data": {
        "rank": "Chief Engineer", "vessel_type": "Oil Tanker", "sea_time": "30+ months",
        "coc": "India", "us_visa": "Valid", "availability": "Immediate"}})
    assert r.status_code == 200
    assert isinstance(r.json()["summary"], str) and len(r.json()["summary"]) > 10


def test_ai_summary_provider(s):
    r = s.post(f"{API}/ai/summary", json={"role": "provider", "data": {
        "rank": "Captain / Master", "vessel_type": "Container", "sea_time": "30+ months",
        "coc": ["Any"], "us_visa": "Must Have", "availability": "Immediate"}})
    assert r.status_code == 200
    assert len(r.json()["summary"]) > 10


# ---- Seeker profile ----
def test_seeker_profile_create(s, seeker_auth):
    tok, user, m = seeker_auth
    payload = {
        "rank": "Third Engineer", "vessel_type": "LNG / LPG Tanker", "sea_time": "9–18 months",
        "coc": "India", "us_visa": "Valid", "other_visa": "",
        "mobile": m, "consent": True, "name": "TEST Seeker",
        "email": "test_seeker@example.com", "availability": "Immediate",
        "summary": "Test summary", "boosted": False,
    }
    r = s.post(f"{API}/seeker/profile", headers=_h(tok), json=payload)
    assert r.status_code == 200
    d = r.json()
    assert "referral_code" in d and len(d["referral_code"]) > 0
    assert d["user_id"] == user["id"]


# ---- Provider requirement + matches + unlock ----
def test_provider_flow_and_unlock(s, provider_auth):
    tok, user, m = provider_auth
    payload = {
        "rank": "Chief Engineer", "vessel_type": "Oil Tanker", "sea_time": "18–30 months",
        "coc": ["India", "Singapore"], "us_visa": "Preferred",
        "mobile": m, "consent": True, "company_name": "TEST Oceanic",
        "email": "test_prov@example.com", "availability": "Immediate", "summary": "test",
    }
    r = s.post(f"{API}/provider/requirement", headers=_h(tok), json=payload)
    assert r.status_code == 200
    assert "referral_code" in r.json()

    r = s.get(f"{API}/matches", headers=_h(tok))
    assert r.status_code == 200
    d = r.json()
    assert d["role"] == "provider"
    assert len(d["matches"]) >= 1
    m0 = d["matches"][0]
    assert m0["name"] == "🔒 Locked" and m0["mobile"] == "🔒 Locked" and m0["email"] == "🔒 Locked"
    assert m0["unlocked"] is False

    seeker_id = m0["id"]
    r = s.post(f"{API}/unlock-cv", headers=_h(tok), json={"seeker_id": seeker_id})
    assert r.status_code == 200
    ud = r.json()
    assert ud["amount"] == 49  # price updated from 20 -> 49
    assert ud["cv"]["name"] != "🔒 Locked" and ud["cv"]["mobile"] != "🔒 Locked"

    r = s.get(f"{API}/matches", headers=_h(tok))
    matches = r.json()["matches"]
    unlocked = [m for m in matches if m["id"] == seeker_id][0]
    assert unlocked["unlocked"] is True


# ---- Boost profile ----
def test_boost_profile(s, seeker_auth):
    tok, _, _ = seeker_auth
    r = s.post(f"{API}/boost-profile", headers=_h(tok))
    assert r.status_code == 200
    d = r.json()
    assert d["amount"] == 100 and d["boosted"] is True


# ---- Documents ----
def test_documents_flow(s, seeker_auth):
    tok, _, _ = seeker_auth
    files = {"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
    r = requests.post(f"{API}/documents?category=CV",
                      headers={"Authorization": f"Bearer {tok}"}, files=files)
    assert r.status_code == 200, r.text
    doc = r.json()
    doc_id = doc["id"]

    r = s.get(f"{API}/documents", headers=_h(tok))
    assert r.status_code == 200
    assert any(d["id"] == doc_id for d in r.json())

    r = requests.get(f"{API}/documents/{doc_id}/download?auth={tok}")
    assert r.status_code == 200
    assert r.content == b"hello world"

    r = s.delete(f"{API}/documents/{doc_id}", headers=_h(tok))
    assert r.status_code == 200

    r = s.get(f"{API}/documents", headers=_h(tok))
    assert not any(d["id"] == doc_id for d in r.json())


# ---- Movement ----
def test_movement(s, seeker_auth):
    tok, _, _ = seeker_auth
    r = s.post(f"{API}/movement", headers=_h(tok),
               json={"status": "Available Now", "available_from": "", "vessel": "", "note": "ready"})
    assert r.status_code == 200
    r = s.get(f"{API}/movement", headers=_h(tok))
    assert r.status_code == 200
    d = r.json()
    assert len(d["history"]) >= 1
    assert d["current"]["status"] == "Available Now"


# ---- Feedback ----
def test_feedback(s, seeker_auth):
    tok, _, _ = seeker_auth
    r = s.post(f"{API}/feedback", headers=_h(tok), json={"category": "Bug", "message": "TEST feedback"})
    assert r.status_code == 200 and r.json()["success"] is True


# ---- Dashboard ----
def test_dashboard(s, seeker_auth):
    tok, _, _ = seeker_auth
    r = s.get(f"{API}/dashboard", headers=_h(tok))
    assert r.status_code == 200
    d = r.json()
    for k in ["seeker_profiles", "provider_requirements", "unlocks", "payments", "documents_count"]:
        assert k in d
    assert len(d["seeker_profiles"]) >= 1
