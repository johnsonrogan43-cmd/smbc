import "dotenv/config";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGO_URI;
if (!uri) throw new Error("MONGO_URI is required");

const client = new MongoClient(uri);
const db = client.db(process.env.MONGO_DB || "smbc");

const customer = {
  fullName: "Yuukoy Hirata",
  email: "yuukoy@example.local",
  phone: "+81 90 4477 2265",
  password: "Customer123!",
  accessCode: "KYR-0004",
  accounts: [
    { name: "Personal Account", type: "PERSONAL", balance: 1250000 },
    { name: "Savings Account", type: "SAVINGS", balance: 640000 },
  ],
};

async function main() {
  await client.connect();

  const existing = await db
    .collection("users")
    .findOne({ email: customer.email });
  if (existing) {
    console.log(
      `User already exists: ${customer.email} (_id ${existing._id}) — nothing created.`,
    );
    return;
  }

  const { insertedId: userId } = await db.collection("users").insertOne({
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    passwordHash: await bcrypt.hash(customer.password, 12),
    accessCode: customer.accessCode,
    status: "ACTIVE",
    createdAt: new Date(),
  });

  for (const [index, item] of customer.accounts.entries()) {
    const accountNumber = `KYR${String(9201 + index * 311).padStart(8, "0")}`;
    const { insertedId: accountId } = await db
      .collection("accounts")
      .insertOne({
        userId: String(userId),
        name: item.name,
        type: item.type,
        currency: "USD",
        accountNumber,
        balance: item.balance,
        status: "ACTIVE",
        createdAt: new Date(),
      });
    await db.collection("transactions").insertOne({
      userId: String(userId),
      accountId: String(accountId),
      type: "CREDIT",
      description: "Opening balance",
      senderName: "Citibank",
      amount: item.balance,
      currency: "USD",
      status: "COMPLETED",
      createdAt: new Date(),
    });
  }

  await db.collection("notifications").insertOne({
    userId: String(userId),
    title: "Welcome to Citibank",
    body: "Your personal banking profile is ready.",
    read: false,
    createdAt: new Date(),
  });

  console.log("Created customer:", {
    id: String(userId),
    fullName: customer.fullName,
    email: customer.email,
    accessCode: customer.accessCode,
    password: customer.password,
    accounts: customer.accounts.map(
      (a) => `${a.name} (¥${a.balance.toLocaleString()})`,
    ),
    totalBalance: customer.accounts.reduce((sum, a) => sum + a.balance, 0),
  });
}

main()
  .then(() => console.log("MongoDB insert complete"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
