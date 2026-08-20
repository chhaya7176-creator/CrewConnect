"""Backend tests for AI CV parsing / standard Maritime CV feature."""
import os
import time
import pytest
import requests
from dotenv import dotenv_values

fe = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or fe.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_MOBILE = "+910000000000"

CV_TEXT = """CURRICULUM VITAE
Name: TEST Suresh Kumar
Date of Birth: 12/05/1985
Nationality: Indian
Gender: Male
Marital Status: Married
Mobile: +919876543210
Email: suresh.kumar@example.com
Address: 24 Marine Drive, Mumbai, India
Nearest Airport: Mumbai (BOM)
Present Rank: Second Engineer
Applied For: Chief Engineer
Total Sea Experience: 96 months
COC Grade: Class 2 Motor
COC Issued By: DG Shipping India
COC Number: COC/2019/44821
INDOS: IND1234567
Passport: Z1234567 valid till 20/08/2030
CDC: MUM99887 expiry 15/03/2029
US Visa: C1/D valid
Schengen: No
Available From: 01/09/2026
Expected Wages: USD 6500

SEA SERVICE
Company: Anglo Eastern | Vessel: MT Global Star | Type: Oil Tanker | Rank: Third Engineer | GRT: 45000 | From 01/01/2019 To 10/10/2019
Company: Synergy Marine | Vessel: MV Ocean Pearl | Type: Bulk Carrier | Rank: Second Engineer | BHP: 12000 | From 05/02/2021 To 20/11/2021

CERTIFICATES
STCW Basic Safety - 8891 - 01/01/2018 - 01/01/2028
Advanced Fire Fighting - 7712 - 03/03/2019 - 03/03/2029

NEXT OF KIN
Name: Anita Kumar, Relation: Wife, Contact: +919812300011
"""


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


def _login(sess, mobile):
    r = sess.post(f"{API}/auth/request-otp", json={"mobile": mobile})
    assert r.status_code == 200, r.text
    r = sess.post(f"{API}/auth/verify-otp", json={"mobile": mobile, "otp": "123456"})
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


@pytest.fixture(scope="session")
def sess():
    return requests.Session()


@pytest.fixture(scope="session")
def user_a(sess):
    return _login(sess, f"+1777{int(time.time()) % 10000000:07d}")


@pytest.fixture(scope="session")
def user_b(sess):
    return _login(sess, f"+1778{int(time.time()) % 10000000:07d}")


@pytest.fixture(scope="session")
def admin(sess):
    tok, u = _login(sess, ADMIN_MOBILE)
    assert u.get("is_admin") is True, f"admin flag missing: {u}"
    return tok, u


def _upload(sess, tok, name, content: bytes, category="CV / Resume"):
    r = sess.post(f"{API}/documents", headers=_h(tok),
                  files={"file": (name, content, "text/plain")},
                  data={"category": category})
    assert r.status_code == 200, r.text
    return r.json()


# ---- parse ----
@pytest.fixture(scope="session")
def parsed_cv(sess, user_a):
    tok, _ = user_a
    doc = _upload(sess, tok, "TEST_cv.txt", CV_TEXT.encode())
    r = sess.post(f"{API}/cv/parse", headers=_h(tok), json={"document_id": doc["id"]}, timeout=180)
    assert r.status_code == 200, r.text
    return r.json()


def test_parse_returns_standard_schema(parsed_cv):
    cv = parsed_cv
    assert "_id" not in cv
    d = cv["data"]
    for sec in ["personal", "contact", "professional", "visas", "availability",
                "sea_service", "certificates", "next_of_kin"]:
        assert sec in d
    assert "Suresh" in d["personal"]["full_name"]
    assert "Engineer" in d["professional"]["present_rank"]
    assert d["personal"]["nationality"].lower().startswith("indian")
    assert isinstance(d["sea_service"], list) and len(d["sea_service"]) >= 2
    assert isinstance(d["certificates"], list) and len(d["certificates"]) >= 1
    assert isinstance(cv["missing_fields"], list)
    assert isinstance(cv["uncertain_fields"], list)
    assert cv["missing_fields"] == [], f"unexpected missing: {cv['missing_fields']}"


def test_get_my_cvs(sess, user_a, parsed_cv):
    tok, _ = user_a
    r = sess.get(f"{API}/cv", headers=_h(tok))
    assert r.status_code == 200
    items = r.json()
    assert any(i["id"] == parsed_cv["id"] for i in items)
    assert items[0]["created_at"] >= items[-1]["created_at"]


def test_update_cv_recomputes_missing(sess, user_a, parsed_cv):
    tok, _ = user_a
    data = dict(parsed_cv["data"])
    data["personal"] = dict(data["personal"])
    data["personal"]["full_name"] = "TEST Updated Name"
    data["contact"] = dict(data["contact"])
    data["contact"]["email"] = ""
    r = sess.put(f"{API}/cv/{parsed_cv['id']}", headers=_h(tok), json={"data": data})
    assert r.status_code == 200, r.text
    assert "contact.email" in r.json()["missing_fields"]
    g = sess.get(f"{API}/cv", headers=_h(tok)).json()
    cur = [c for c in g if c["id"] == parsed_cv["id"]][0]
    assert cur["data"]["personal"]["full_name"] == "TEST Updated Name"
    assert "contact.email" in cur["missing_fields"]
    # restore email
    data["contact"]["email"] = "suresh.kumar@example.com"
    r = sess.put(f"{API}/cv/{parsed_cv['id']}", headers=_h(tok), json={"data": data})
    assert r.status_code == 200
    assert "contact.email" not in r.json()["missing_fields"]


def test_pdf_download(sess, user_a, parsed_cv):
    tok, _ = user_a
    r = sess.get(f"{API}/cv/{parsed_cv['id']}/pdf", params={"auth": tok})
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("application/pdf")
    assert r.content[:4] == b"%PDF" and len(r.content) > 1000


def test_pdf_requires_auth(sess, parsed_cv):
    r = sess.get(f"{API}/cv/{parsed_cv['id']}/pdf")
    assert r.status_code == 401


def test_other_user_cannot_edit_or_download(sess, user_b, parsed_cv):
    tok, _ = user_b
    r = sess.put(f"{API}/cv/{parsed_cv['id']}", headers=_h(tok), json={"data": parsed_cv["data"]})
    assert r.status_code == 403, r.text
    r = sess.get(f"{API}/cv/{parsed_cv['id']}/pdf", params={"auth": tok})
    assert r.status_code == 403, r.text


def test_cv_not_found(sess, user_a):
    tok, _ = user_a
    assert sess.put(f"{API}/cv/nope-123", headers=_h(tok), json={"data": {}}).status_code == 404
    assert sess.get(f"{API}/cv/nope-123/pdf", params={"auth": tok}).status_code == 404


def test_parse_unreadable_file_returns_400(sess, user_a):
    tok, _ = user_a
    doc = _upload(sess, tok, "TEST_empty.pdf", b"\x00\x01not-a-pdf")
    r = sess.post(f"{API}/cv/parse", headers=_h(tok), json={"document_id": doc["id"]})
    assert r.status_code == 400, r.text
    assert "read text" in r.json()["detail"].lower()


def test_parse_other_users_document_404(sess, user_b, parsed_cv):
    tok, _ = user_b
    r = sess.post(f"{API}/cv/parse", headers=_h(tok), json={"document_id": parsed_cv["document_id"]})
    assert r.status_code == 404


def test_parse_requires_auth(sess):
    r = sess.post(f"{API}/cv/parse", json={"document_id": "x"})
    assert r.status_code in (401, 403)


# ---- admin ----
def test_admin_list_cvs(sess, admin, parsed_cv):
    tok, _ = admin
    r = sess.get(f"{API}/admin/cvs", headers=_h(tok))
    assert r.status_code == 200, r.text
    items = r.json()
    assert any(i["id"] == parsed_cv["id"] for i in items)
    assert all("_id" not in i for i in items)


def test_admin_stats(sess, admin):
    tok, _ = admin
    r = sess.get(f"{API}/admin/stats", headers=_h(tok))
    assert r.status_code == 200
    d = r.json()
    for k in ["users", "seekers", "providers", "documents", "parsed_cvs", "feedback"]:
        assert isinstance(d[k], int)
    assert d["parsed_cvs"] >= 1


def test_non_admin_forbidden(sess, user_b):
    tok, _ = user_b
    assert sess.get(f"{API}/admin/cvs", headers=_h(tok)).status_code == 403
    assert sess.get(f"{API}/admin/stats", headers=_h(tok)).status_code == 403


def test_admin_can_edit_others_cv(sess, admin, parsed_cv):
    tok, _ = admin
    data = dict(parsed_cv["data"])
    data["professional"] = dict(data["professional"])
    data["professional"]["applied_rank"] = "TEST Chief Engineer Admin"
    r = sess.put(f"{API}/cv/{parsed_cv['id']}", headers=_h(tok), json={"data": data})
    assert r.status_code == 200, r.text
    assert r.json()["edited_by"] == "admin"
    assert r.json()["data"]["professional"]["applied_rank"] == "TEST Chief Engineer Admin"


def test_admin_can_download_others_pdf(sess, admin, parsed_cv):
    tok, _ = admin
    r = sess.get(f"{API}/cv/{parsed_cv['id']}/pdf", params={"auth": tok})
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"
