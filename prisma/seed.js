import 'dotenv/config'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'

const uri = process.env.MONGO_URI
if (!uri) throw new Error('MONGO_URI is required')

const client = new MongoClient(uri)
const db = client.db(process.env.MONGO_DB || 'smbc')

async function main() {
  await client.connect()
  for (const collection of ['emailNotifications', 'verificationCodes', 'transfers', 'transactions', 'accounts', 'notifications', 'sessions', 'auditLogs', 'users', 'admins']) await db.collection(collection).deleteMany({})

  const { insertedId: adminId } = await db.collection('admins').insertOne({ email: 'admin@citibank.local', passwordHash: await bcrypt.hash('Admin123!', 10), name: 'Citibank Operations', createdAt: new Date() })
  const customers = [
    { fullName: 'Haru Yamamoto', email: 'haru@example.local', phone: '+81 90 1234 4821', balances: [1840500, 1000000] },
    { fullName: 'Aiko Tanaka', email: 'aiko@example.local', phone: '+81 80 5555 7193', balances: [920000] },
    { fullName: 'Ren Sato', email: 'ren@example.local', phone: '+81 70 8888 1032', balances: [3285000, 420000] },
  ]
  for (const [index, item] of customers.entries()) {
    const { insertedId: userId } = await db.collection('users').insertOne({ fullName: item.fullName, email: item.email, phone: item.phone, passwordHash: await bcrypt.hash('Customer123!', 12), accessCode: `KYR-${String(index + 1).padStart(4, '0')}`, status: 'ACTIVE', createdAt: new Date() })
    for (const [accountIndex, balance] of item.balances.entries()) {
      const { insertedId: accountId } = await db.collection('accounts').insertOne({ userId: String(userId), name: accountIndex ? 'Savings Account' : 'Personal Account', type: accountIndex ? 'SAVINGS' : 'PERSONAL', currency: 'USD', accountNumber: `KYR${String(4821 + index * 137 + accountIndex * 237).padStart(8, '0')}`, balance, status: 'ACTIVE', createdAt: new Date() })
      await db.collection('transactions').insertOne({ userId: String(userId), accountId: String(accountId), type: 'CREDIT', description: 'Opening balance', senderName: 'Citibank', amount: balance, currency: 'USD', status: 'COMPLETED', createdAt: new Date() })
    }
    await db.collection('notifications').insertOne({ userId: String(userId), title: 'Welcome to Citibank', body: 'Your personal banking profile is ready.', read: false, createdAt: new Date() })
  }
  const user = await db.collection('users').findOne({ email: 'haru@example.local' })
  const account = await db.collection('accounts').findOne({ userId: String(user._id) })
  await db.collection('transactions').insertOne({ userId: String(user._id), accountId: String(account._id), type: 'CREDIT', description: 'Incoming Transfer', senderName: 'Yamato Holdings', amount: 500000, currency: 'USD', status: 'COMPLETED', createdAt: new Date() })
  await db.collection('accounts').updateOne({ _id: account._id }, { $inc: { balance: 500000 } })
  await db.collection('auditLogs').insertOne({ adminId: String(adminId), action: 'SEED_DATABASE', entityType: 'SYSTEM', details: 'Development seed created', createdAt: new Date() })
}

main().then(() => console.log('MongoDB seed complete')).catch(error => { console.error(error); process.exitCode = 1 }).finally(() => client.close())