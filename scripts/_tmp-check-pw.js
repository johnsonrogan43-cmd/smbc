import "dotenv/config";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const client = new MongoClient(process.env.MONGO_URI);
const db = client.db(process.env.MONGO_DB || "smbc");

await client.connect();
const u = await db
  .collection("users")
  .findOne(
    { email: "yuukoy@example.local" },
    { projection: { passwordHash: 1, email: 1 } },
  );
console.log("STORED VALUE      :", u.passwordHash);
console.log("IS BCRYPT HASH    :", u.passwordHash.startsWith("$2"));
console.log(
  "MATCHES Customer123! :",
  await bcrypt.compare("Customer123!", u.passwordHash),
);
await client.close();
