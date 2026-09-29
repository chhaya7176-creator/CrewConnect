import os, sys, random, requests

API = os.popen("grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2").read().strip() + "/api"
def rnd(p): return f"{p}{random.randint(10000000,99999999)}"

def signup(mobile, role):
    requests.post(f"{API}/auth/request-otp", json={"mobile": mobile})
    r = requests.post(f"{API}/auth/verify-otp", json={"mobile": mobile, "otp": "123456", "role": role})
    return r.json()["token"]

def H(t): return {"Authorization": f"Bearer {t}"}

co = rnd("+9198"); ctok = signup(co, "provider")
requests.post(f"{API}/provider/requirement", headers=H(ctok), json={
    "rank": "Chief Engineer", "vessel_type": "Bulk Carrier", "sea_time": "30+ months",
    "sea_time_priority": "Mandatory", "coc": ["India"], "coc_priority": "Mandatory",
    "us_visa": "Preferred", "mobile": co, "consent": True, "company_name": "Neptune Shipping",
    "email": "hr@neptune.com", "availability": "01/08/2026", "vessel_name": "MV Neptune",
    "port": "Mumbai", "audits": [{"type": "SIRE", "date": "10/08/2026"}]})

sids = []
for i in range(7):
    sk = rnd("+9197"); stok = signup(sk, "seeker")
    r = requests.post(f"{API}/seeker/profile", headers=H(stok), json={
        "rank": "Chief Engineer", "vessel_type": "Bulk Carrier", "sea_time": "30+ months",
        "coc": "India", "us_visa": "Valid", "availability": "01/08/2026", "mobile": sk,
        "name": f"Crew {i}", "email": f"c{i}@sea.com", "consent": True})
    sids.append(r.json()["id"])

print("=== requirement stored vessel_name/port/audits ===")
m = requests.get(f"{API}/matches", headers=H(ctok)).json()
req = m.get("requirement", {})
print("vessel_name:", req.get("vessel_name"), "| port:", req.get("port"), "| audits:", req.get("audits"))
print("matches count:", len(m.get("matches", [])), "| free_unlocks_left:", m.get("free_unlocks_left"))

print("=== 5 free unlocks then payment required ===")
for i in range(5):
    r = requests.post(f"{API}/unlock-cv", headers=H(ctok), json={"seeker_id": sids[i]}).json()
    print(f" unlock {i+1}: success={r.get('success')} amount={r.get('amount')} left={r.get('free_unlocks_left')}")
r6 = requests.post(f"{API}/unlock-cv", headers=H(ctok), json={"seeker_id": sids[5]}).json()
print(" unlock 6 (expect needs_payment):", r6.get("success"), r6.get("needs_payment"), "amount=", r6.get("amount"))

print("=== pay ₹29 (mock) for 6th ===")
o = requests.post(f"{API}/pay/create-order", headers=H(ctok), json={"purpose": "cv_unlock", "seeker_id": sids[5]}).json()
print(" order:", o.get("order_id"), "amount=", o.get("amount"), "mock=", o.get("mock"))
v = requests.post(f"{API}/pay/verify", headers=H(ctok), json={"order_id": o["order_id"], "purpose": "cv_unlock", "seeker_id": sids[5]}).json()
print(" verify:", v.get("success"), "cv name=", v.get("cv", {}).get("name"))

st = requests.get(f"{API}/company/status", headers=H(ctok)).json()
print("=== company status ===", "subscribed:", st["subscribed"], "unlock_price:", st["unlock_price"], "sub_price:", st["subscription_price"], "dl_today:", st["downloads_today"])

print("=== subscribe ₹199000 (mock) ===")
o2 = requests.post(f"{API}/pay/create-order", headers=H(ctok), json={"purpose": "subscription"}).json()
print(" order:", o2.get("order_id"), "amount=", o2.get("amount"), "mock=", o2.get("mock"))
v2 = requests.post(f"{API}/pay/verify", headers=H(ctok), json={"order_id": o2["order_id"], "purpose": "subscription"}).json()
print(" verify:", v2.get("success"), "expiry:", (v2.get("subscription_expiry") or "")[:10])

print("=== after subscribe: unlock is free again ===")
r7 = requests.post(f"{API}/unlock-cv", headers=H(ctok), json={"seeker_id": sids[6]}).json()
print(" unlock 7 (subscribed, expect free):", r7.get("success"), "amount=", r7.get("amount"))

print("=== banner ===")
b = requests.post(f"{API}/company/banner", headers=H(ctok), json={"title": "Join Neptune Shipping", "tagline": "Now hiring Chief Engineers"}).json()
print(" set banner:", b)
bl = requests.get(f"{API}/banners").json()
print(" banners visible:", len(bl.get("banners", [])), "| titles:", [x.get("title") for x in bl.get("banners", [])])

print("=== CV download (Standard PDF, subscribed) ===")
d = requests.get(f"{API}/cv/{sids[0]}/download", headers=H(ctok))
print(" status:", d.status_code, "| content-type:", d.headers.get("content-type"), "| bytes:", len(d.content), "| pdf-magic:", d.content[:4])
st2 = requests.get(f"{API}/company/status", headers=H(ctok)).json()
print(" downloads_today after:", st2["downloads_today"])
