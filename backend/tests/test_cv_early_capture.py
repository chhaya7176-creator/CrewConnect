"""Backend tests for the reordered SEAFARER flow: CV upload right after OTP (early lead capture)."""
import os
import random
import time

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
OTP = "123456"


def fresh_mobile():
    return "+9198" + str(random.randint(10000000, 99999999))


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


# --- Auth: fresh mobile OTP login (creates user) ---
def login_fresh(session):
    mobile = fresh_mobile()
    r = session.post(f"{API}/auth/request-otp", json={"mobile": mobile})
    assert r.status_code == 200, r.text
    assert r.json().get("demo_otp") == OTP
    v = session.post(f"{API}/auth/verify-otp", json={"mobile": mobile, "otp": OTP})
    assert v.status_code == 200, v.text
    data = v.json()
    assert "token" in data and data["user"]["mobile"] == mobile
    return mobile, data["token"], data["user"]


class TestCvEarlyCapture:
    def test_upload_cv_right_after_otp_persists(self, session):
        mobile, token, user = login_fresh(session)
        headers = {"Authorization": f"Bearer {token}"}

        files = {"file": ("TEST_cv_early.txt", b"Name: TEST QA Seafarer\nRank: Master\nSea time: 60 months\n", "text/plain")}
        up = requests.post(f"{API}/documents", params={"category": "CV / Resume"}, files=files, headers=headers)
        assert up.status_code == 200, up.text
        doc = up.json()
        assert "_id" not in doc
        assert doc["category"] == "CV / Resume"
        assert doc["original_filename"] == "TEST_cv_early.txt"
        assert doc["size"] > 0
        doc_id = doc["id"]

        # GET verifies persistence without ever creating a seeker profile
        lst = requests.get(f"{API}/documents", headers=headers)
        assert lst.status_code == 200
        docs = lst.json()
        assert any(d["id"] == doc_id and d["category"] == "CV / Resume" for d in docs)
        assert all("_id" not in d for d in docs)

        # profile NOT created -> drop-off scenario; document still there after re-login
        r = requests.post(f"{API}/auth/request-otp", json={"mobile": mobile})
        assert r.status_code == 200
        v = requests.post(f"{API}/auth/verify-otp", json={"mobile": mobile, "otp": OTP})
        assert v.status_code == 200
        token2 = v.json()["token"]
        lst2 = requests.get(f"{API}/documents", headers={"Authorization": f"Bearer {token2}"})
        assert lst2.status_code == 200
        assert any(d["id"] == doc_id for d in lst2.json())

        # cleanup
        d = requests.delete(f"{API}/documents/{doc_id}", headers={"Authorization": f"Bearer {token2}"})
        assert d.status_code in (200, 204)

    def test_documents_requires_auth(self):
        files = {"file": ("TEST_noauth.txt", b"x", "text/plain")}
        up = requests.post(f"{API}/documents", params={"category": "CV / Resume"}, files=files)
        assert up.status_code in (401, 403), up.text
        lst = requests.get(f"{API}/documents")
        assert lst.status_code in (401, 403)

    def test_file_size_cap_5mb(self, session):
        mobile, token, user = login_fresh(session)
        headers = {"Authorization": f"Bearer {token}"}
        big = b"a" * (5 * 1024 * 1024 + 1024)
        up = requests.post(f"{API}/documents", params={"category": "CV / Resume"},
                           files={"file": ("TEST_big.txt", big, "text/plain")}, headers=headers)
        assert up.status_code == 400, up.status_code
        assert "5 MB" in up.json().get("detail", "")

    def test_skip_path_seeker_profile_without_cv(self, session):
        """Skip CV -> profile submission must still succeed."""
        mobile, token, user = login_fresh(session)
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "mobile": mobile,
            "rank": "Master", "vessel_type": "Bulk Carrier", "sea_time": "36-60 months",
            "coc": "India", "us_visa": "Valid", "other_visa": "", "consent": True,
            "name": "TEST_QA Skip", "email": "test_qa_skip@example.com",
            "availability": "Immediate", "summary": "TEST summary",
        }
        r = requests.post(f"{API}/seeker/profile", json=payload, headers=headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("referral_code")
        # documents list should be empty (skipped)
        lst = requests.get(f"{API}/documents", headers=headers)
        assert lst.status_code == 200
        assert lst.json() == []
        # matches render
        m = requests.get(f"{API}/matches", headers=headers)
        assert m.status_code == 200
        assert isinstance(m.json().get("matches"), list)

    def test_config_lists_present(self):
        c = requests.get(f"{API}/config")
        assert c.status_code == 200
        cfg = c.json()
        for key in ["ranks", "vessel_types", "sea_time", "coc_seeker", "us_visa_seeker"]:
            assert cfg.get(key), f"missing {key}"
