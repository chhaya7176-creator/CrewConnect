"""Test helper: reset match-alert state for the company demo account so the
new-matches banner and alert opt-in toggle can be exercised from a clean state."""
import asyncio
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    u = await db.users.find_one({"mobile_key": "9930867220"}, {"_id": 0})
    print("user:", u and {k: u.get(k) for k in ("id", "mobile", "alert_optin", "alert_whatsapp", "matches_seen_at")})
    if u:
        await db.users.update_one(
            {"id": u["id"]},
            {"$set": {"matches_seen_at": "2000-01-01T00:00:00+00:00", "alert_optin": False}},
        )
        print("reset done")
    print("saved_searches:", await db.saved_searches.count_documents({}))
    client.close()


asyncio.run(main())
