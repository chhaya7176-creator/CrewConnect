import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

OTP = "123456"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _auth(client, mobile):
    r = client.post(f"{BASE_URL}/api/auth/request-otp", json={"mobile": mobile})
    assert r.status_code == 200, r.text
    r = client.post(f"{BASE_URL}/api/auth/verify-otp", json={"mobile": mobile, "otp": OTP})
    assert r.status_code == 200, r.text
    tok = r.json().get("token")
    assert tok
    return tok


# ---- config endpoint (options used by chat flow) ----
def test_config_options(client):
    r = client.get(f"{BASE_URL}/api/config")
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d.get("us_visa_provider"), list) and len(d["us_visa_provider"]) == 3
    assert isinstance(d.get("us_visa_seeker"), list)
    assert isinstance(d.get("coc_provider"), list) and len(d["coc_provider"]) > 1


# ---- provider requirement without us_visa_priority (optional field) ----
def test_provider_requirement_without_us_visa_priority(client):
    mobile = "+9198000" + str(uuid.uuid4().int)[:5]
    tok = _auth(client, mobile)
    payload = {
        "rank": "Chief Officer",
        "vessel_type": "Bulk Carrier",
        "sea_time": "9\u201318 months",
        "sea_time_priority": "Mandatory",
        "coc": ["India", "UK", "Singapore"],
        "coc_priority": "Preferred",
        "us_visa": "Must Have",
        "mobile": mobile,
        "consent": True,
        "company_name": "TEST_Co",
        "email": "test@co.com",
        "availability": "Immediate",
        "availability_priority": "Mandatory",
        "summary": "TEST summary",
    }
    r = client.post(f"{BASE_URL}/api/provider/requirement", json=payload,
                    headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert "_id" not in data
    rid = data.get("id") or data.get("requirement", {}).get("id")
    assert rid, data
    assert data.get("us_visa_priority") == "Preferred"  # default applied
    # verify persistence via /matches (provider role echoes requirement)
    g = client.get(f"{BASE_URL}/api/matches", headers={"Authorization": f"Bearer {tok}"})
    assert g.status_code == 200, g.text
    gd = g.json()
    assert gd.get("role") == "provider"
    reqd = gd.get("requirement", {})
    assert reqd.get("coc") == ["India", "UK", "Singapore"]
    assert reqd.get("us_visa") == "Must Have"
    assert "_id" not in reqd


def test_provider_requirement_missing_required_field_rejected(client):
    mobile = "+9198001" + str(uuid.uuid4().int)[:5]
    tok = _auth(client, mobile)
    r = client.post(f"{BASE_URL}/api/provider/requirement", json={"rank": "Master"},
                    headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 422, r.status_code


# ---- seeker matches ----
def test_seeker_matches(client):
    tok = _auth(client, "+919555000111")
    r = client.get(f"{BASE_URL}/api/matches", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("role") in ("seeker", "provider", None)
    items = d.get("matches", d.get("items", []))
    assert isinstance(items, list)
    assert len(items) > 0, f"no matches returned: {d}"
    first = items[0]
    for k in ("rank", "vessel_type", "coc", "us_visa"):
        assert k in first, f"missing {k} in match: {first}"
    assert "_id" not in first
