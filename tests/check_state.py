import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

env = dotenv_values("/app/backend/.env")

async def main():
    cl = AsyncIOMotorClient(env["MONGO_URL"])
    db = cl[env["DB_NAME"]]
    u = await db.users.find_one({"mobile_key": "9930867220"}, {"_id": 0})
    print("user:", u)
    if u:
        print("unlocks:", await db.unlocks.count_documents({"user_id": u["id"]}))
        p = await db.providers.find_one({"user_id": u["id"]}, {"_id": 0}, sort=[("created_at", -1)])
        print("provider email:", p and p.get("email"), "| company:", p and p.get("company_name"), "| rank:", p and p.get("rank"))
    print("seekers:", await db.seekers.count_documents({}))

asyncio.run(main())
