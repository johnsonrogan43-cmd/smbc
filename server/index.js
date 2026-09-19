import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { MongoClient, ObjectId } from 'mongodb'

const uri = process.env.MONGO_URI
if (!uri) throw new Error('MONGO_URI is required')
const client = new MongoClient(uri)
const db = client.db(process.env.MONGO_DB || 'smbc')
const app = express()
const port = process.env.PORT || 4000
const secret = process.env.JWT_SECRET || 'development-secret'

app.use(express.json())
app.use(cookieParser())

const coll = name => db.collection(name)
const oid = id => { try { return new ObjectId(id) } catch { return id } }
const publicAccount = account => ({ ...account, id: String(account._id), balance: Number(account.balance), maskedNumber: `•••• ${account.accountNumber.slice(-4)}` })
const publicTransaction = transaction => ({ ...transaction, id: String(transaction._id), amount: Number(transaction.amount) })
const publicTransfer = transfer => ({ ...transfer, id: String(transfer._id), amount: Number(transfer.amount), fee: Number(transfer.fee), stages: [1, 2, 3, 4].map(stage => ({ stage, status: stage < transfer.currentStage || transfer.status === 'COMPLETED' ? 'COMPLETED' : stage === transfer.currentStage && transfer.status === 'VERIFICATION_REQUIRED' ? 'PENDING' : 'LOCKED' })) })
const tokenFor = payload => jwt.sign(payload, secret, { expiresIn: '8h' })
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const code = () => `SMB-${crypto.randomInt(1000, 10000)}`
const reference = () => `TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

async function connect() {
  await client.connect()
  await Promise.all([
    coll('users').createIndex({ email: 1 }, { unique: true }),
    coll('users').createIndex({ accessCode: 1 }),
    coll('accounts').createIndex({ accountNumber: 1 }, { unique: true }),
    coll('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
    coll('transfers').createIndex({ reference: 1 }, { unique: true }),
  ])
  await ensureDefaultSeedData()
}

async function ensureDefaultSeedData() {
  const adminEmail = 'admin@kiyorabank.local'
  const adminExists = await coll('admins').findOne({ email: adminEmail })
  if (!adminExists) {
    await coll('admins').insertOne({
      email: adminEmail,
      passwordHash: await bcrypt.hash('Admin123!', 12),
      name: 'Kiyora Operations',
      createdAt: new Date(),
    })
  }

  const customerEmail = 'haru@example.local'
  const customerExists = await coll('users').findOne({ email: customerEmail })
  if (!customerExists) {
    const { insertedId: userId } = await coll('users').insertOne({
      fullName: 'Haru Yamamoto',
      email: customerEmail,
      phone: '+81 90 1234 4821',
      passwordHash: await bcrypt.hash('Customer123!', 12),
      status: 'ACTIVE',
      accessCode: 'KYR-0001',
      createdAt: new Date(),
    })

    const accountNumber = 'KYR00000001'
    const existingAccount = await coll('accounts').findOne({ accountNumber })
    if (!existingAccount) {
      const { insertedId: accountId } = await coll('accounts').insertOne({
        userId: String(userId),
        name: 'Personal Account',
        type: 'PERSONAL',
        currency: 'JPY',
        accountNumber,
        balance: 1840500,
        status: 'ACTIVE',
        createdAt: new Date(),
      })
      await coll('transactions').insertOne({
        userId: String(userId),
        accountId: String(accountId),
        type: 'CREDIT',
        description: 'Opening balance',
        senderName: 'Kiyora Bank',
        amount: 1840500,
        currency: 'JPY',
        status: 'COMPLETED',
        createdAt: new Date(),
      })
    }
  }
}

async function auth(req, res, next) {
  try {
    const raw = req.cookies.smbc_session
    if (!raw) return res.status(401).json({ error: 'Authentication required' })
    const payload = jwt.verify(raw, secret)
    if (payload.kind === 'admin') req.admin = await coll('admins').findOne({ _id: oid(payload.id) })
    else req.user = await coll('users').findOne({ _id: oid(payload.id) })
    if (!req.admin && !req.user) return res.status(401).json({ error: 'Session expired' })
    next()
  } catch { res.status(401).json({ error: 'Authentication required' }) }
}
const adminOnly = (req, res, next) => req.admin ? next() : res.status(403).json({ error: 'Admin access required' })
const customerOnly = (req, res, next) => req.user ? next() : res.status(403).json({ error: 'Customer access required' })

app.get('/api/health', (_, res) => res.json({ ok: true }))
app.post('/api/auth/admin/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const admin = await coll('admins').findOne({ email })
  if (!admin || !(await bcrypt.compare(String(req.body.password || ''), admin.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' })
  const token = tokenFor({ kind: 'admin', id: String(admin._id) })
  await coll('sessions').insertOne({ tokenHash: hash(token), adminId: String(admin._id), expiresAt: new Date(Date.now() + 8 * 3600000), createdAt: new Date() })
  res.cookie('smbc_session', token, { httpOnly: true, sameSite: 'lax' }).json({ role: 'admin', name: admin.name })
})
app.post('/api/auth/customer/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const user = await coll('users').findOne({ email })
  if (!user || user.status !== 'ACTIVE' || !user.passwordHash || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) return res.status(401).json({ error: 'Invalid customer credentials' })
  const token = tokenFor({ kind: 'customer', id: String(user._id) })
  await coll('sessions').insertOne({ tokenHash: hash(token), userId: String(user._id), expiresAt: new Date(Date.now() + 8 * 3600000), createdAt: new Date() })
  res.cookie('smbc_session', token, { httpOnly: true, sameSite: 'lax' }).json({ role: 'customer', name: user.fullName })
})
app.post('/api/auth/customer/register', async (req, res) => {
  const fullName = String(req.body.fullName || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const phone = String(req.body.phone || '').trim()
  const password = String(req.body.password || '')
  if (!fullName || !email || !phone || !password) return res.status(400).json({ error: 'Full name, email, phone, and password are required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' })
  if (await coll('users').findOne({ email })) return res.status(409).json({ error: 'An account with this email already exists' })
  const accessCode = code()
  const { insertedId } = await coll('users').insertOne({ fullName, email, phone, accessCode, passwordHash: await bcrypt.hash(password, 12), status: 'ACTIVE', createdAt: new Date() })
  await coll('notifications').insertOne({ userId: String(insertedId), title: 'Welcome to SMBC', body: 'Your customer profile is ready. Use your access code to sign in.', createdAt: new Date() })
  res.status(201).json({ fullName, email })
})
app.post('/api/auth/forgot-access-code', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const user = await coll('users').findOne({ email })
  if (user) {
    const accessCode = code()
    const body = 'Your access code has been reset. Please use the secure message sent by SMBC to sign in.'
    await coll('users').updateOne({ _id: user._id }, { $set: { accessCode } })
    await coll('notifications').insertOne({ userId: String(user._id), title: 'Access code reset', body, createdAt: new Date() })
    await coll('emailNotifications').insertOne({ userId: String(user._id), subject: 'SMBC access code reset', body: `${body} New access code: ${accessCode}`, sentAt: new Date() })
  }
  res.json({ message: 'If an account matches that email, access-code recovery instructions have been sent.' })
})
app.post('/api/auth/logout', async (req, res) => { if (req.cookies.smbc_session) await coll('sessions').deleteMany({ tokenHash: hash(req.cookies.smbc_session) }); res.clearCookie('smbc_session').json({ ok: true }) })
app.get('/api/auth/me', auth, (req, res) => res.json(req.admin ? { role: 'admin', name: req.admin.name } : { role: 'customer', name: req.user.fullName, userId: String(req.user._id) }))

app.get('/api/admin/stats', auth, adminOnly, async (_, res) => {
  const [customers, accounts, pending, completed, transactions] = await Promise.all([
    coll('users').countDocuments(),
    coll('accounts').countDocuments({ status: 'ACTIVE' }),
    coll('transfers').countDocuments({ status: { $ne: 'COMPLETED' } }),
    coll('transfers').countDocuments({ status: 'COMPLETED' }),
    coll('transactions').countDocuments(),
  ])
  res.json({ customers, accounts, pendingTransfers: pending, completedTransfers: completed, transactions })
})
app.get('/api/admin/customers', auth, adminOnly, async (_, res) => {
  const customers = await coll('users').find({}).sort({ createdAt: -1 }).toArray()
  const accounts = await coll('accounts').find({ userId: { $in: customers.map(c => String(c._id)) } }).toArray()
  res.json(customers.map(customer => ({ ...publicUser(customer), accounts: accounts.filter(a => a.userId === String(customer._id)).map(publicAccount), balance: accounts.filter(a => a.userId === String(customer._id)).reduce((sum, a) => sum + a.balance, 0), accessCode: customer.accessCode })))
})
app.get('/api/admin/customers/:id', auth, adminOnly, async (req, res) => {
  const customer = await coll('users').findOne({ _id: oid(req.params.id) })
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  const accounts = await coll('accounts').find({ userId: String(customer._id) }).toArray()
  const transactions = await coll('transactions').find({ userId: String(customer._id) }).sort({ createdAt: -1 }).limit(20).toArray()
  res.json({ ...publicUser(customer), accounts: accounts.map(publicAccount), transactions: transactions.map(publicTransaction), balance: accounts.reduce((sum, a) => sum + a.balance, 0), accessCode: customer.accessCode })
})
app.post('/api/admin/customers', auth, adminOnly, async (req, res) => {
  const customer = await coll('users').insertOne({ fullName: req.body.fullName, email: String(req.body.email || '').trim().toLowerCase(), phone: req.body.phone || '', status: req.body.status || 'ACTIVE', accessCode: code(), createdAt: new Date() })
  await coll('auditLogs').insertOne({ adminId: String(req.admin._id), action: 'CREATE_CUSTOMER', entityType: 'USER', entityId: String(customer.insertedId), createdAt: new Date() })
  res.json(await coll('users').findOne({ _id: customer.insertedId }))
})
app.post('/api/admin/customers/:id/access-code', auth, adminOnly, async (req, res) => { const accessCode = code(); await coll('users').updateOne({ _id: oid(req.params.id) }, { $set: { accessCode } }); res.json({ accessCode, customerId: req.params.id }) })
app.post('/api/admin/customers/:id/suspend', auth, adminOnly, async (req, res) => res.json(await coll('users').findOneAndUpdate({ _id: oid(req.params.id) }, { $set: { status: 'SUSPENDED' } }, { returnDocument: 'after' })))
app.post('/api/admin/accounts', auth, adminOnly, async (req, res) => {
  const accountNumber = req.body.accountNumber || `SMB${crypto.randomInt(10000000, 99999999)}`
  const account = await coll('accounts').insertOne({ userId: req.body.userId, name: req.body.name, type: req.body.type || 'PERSONAL', currency: req.body.currency || 'JPY', accountNumber, balance: Number(req.body.openingBalance || 0), status: 'ACTIVE', createdAt: new Date() })
  await coll('auditLogs').insertOne({ adminId: String(req.admin._id), action: 'CREATE_ACCOUNT', entityType: 'ACCOUNT', entityId: String(account.insertedId), createdAt: new Date() })
  res.json(publicAccount(await coll('accounts').findOne({ _id: account.insertedId })))
})
app.get('/api/admin/accounts', auth, adminOnly, async (_, res) => {
  const accounts = await coll('accounts').find({}).sort({ createdAt: -1 }).toArray()
  const users = await coll('users').find({ _id: { $in: accounts.map(a => oid(a.userId)) } }).toArray()
  res.json(accounts.map(account => ({ ...publicAccount(account), customer: (users.find(u => String(u._id) === account.userId) || {}).fullName, email: (users.find(u => String(u._id) === account.userId) || {}).email })))
})
app.post('/api/admin/transactions', auth, adminOnly, async (req, res) => {
  const amount = Number(req.body.amount)
  const account = await coll('accounts').findOne({ _id: oid(req.body.accountId) })
  if (!account || !amount || amount <= 0) return res.status(400).json({ error: 'Select an account and enter a positive amount' })
  const { insertedId } = await coll('transactions').insertOne({ userId: account.userId, accountId: String(account._id), type: 'CREDIT', description: req.body.description, senderName: req.body.senderName, amount, currency: req.body.currency || 'JPY', status: 'COMPLETED', createdAt: req.body.date ? new Date(req.body.date) : new Date() })
  await coll('accounts').updateOne({ _id: account._id }, { $inc: { balance: amount } })
  await coll('notifications').insertOne({ userId: account.userId, title: 'Incoming Transfer', body: `+¥${amount.toLocaleString()} has been credited to ${account.name}.`, createdAt: new Date() })
  res.json(publicTransaction(await coll('transactions').findOne({ _id: insertedId })))
})
app.get('/api/admin/transactions', auth, adminOnly, async (_, res) => {
  const transactions = await coll('transactions').find({}).sort({ createdAt: -1 }).limit(200).toArray()
  const users = await coll('users').find({ _id: { $in: transactions.map(t => oid(t.userId)) } }).toArray()
  const accounts = await coll('accounts').find({ _id: { $in: transactions.map(t => oid(t.accountId)) } }).toArray()
  res.json(transactions.map(transaction => ({ ...publicTransaction(transaction), customer: (users.find(u => String(u._id) === transaction.userId) || {}).fullName, account: (accounts.find(a => String(a._id) === transaction.accountId) || {}).name, accountNumber: (accounts.find(a => String(a._id) === transaction.accountId) || {}).accountNumber })))
})
app.get('/api/admin/transfers', auth, adminOnly, async (_, res) => {
  const transfers = await coll('transfers').find({}).sort({ createdAt: -1 }).toArray()
  const users = await coll('users').find({ _id: { $in: transfers.map(t => oid(t.userId)) } }).toArray()
  const accounts = await coll('accounts').find({ _id: { $in: transfers.map(t => oid(t.accountId)) } }).toArray()
  res.json(transfers.map(transfer => ({ ...publicTransfer(transfer), customer: (users.find(u => String(u._id) === transfer.userId) || {}).fullName, account: (accounts.find(a => String(a._id) === transfer.accountId) || {}) })))
})
app.get('/api/admin/transfers/:id', auth, adminOnly, async (req, res) => {
  const transfer = await coll('transfers').findOne({ _id: oid(req.params.id) })
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' })
  const codes = await coll('verificationCodes').find({ transferId: String(transfer._id) }).toArray()
  res.json({ ...publicTransfer(transfer), verificationCodes: codes.map(({ codeHash, ...item }) => ({ ...item, stage: item.stage })) })
})
app.post('/api/admin/transfers', auth, adminOnly, async (req, res) => {
  const amount = Number(req.body.amount)
  if (!req.body.accountId || !amount || amount <= 0) return res.status(400).json({ error: 'Select an account and enter a positive amount' })
  const account = await coll('accounts').findOne({ _id: oid(req.body.accountId) })
  const { insertedId } = await coll('transfers').insertOne({ userId: account.userId, accountId: String(account._id), recipientName: req.body.recipientName, bankName: req.body.bankName, recipientAccount: req.body.recipientAccount, amount, fee: 0, currency: req.body.currency || 'JPY', message: req.body.message, status: 'VERIFICATION_REQUIRED', currentStage: 1, reference: reference(), createdAt: new Date() })
  res.json(publicTransfer(await coll('transfers').findOne({ _id: insertedId })))
})
app.post('/api/admin/transfers/:id/code', auth, adminOnly, async (req, res) => {
  const stage = Number(req.body.stage)
  const transfer = await coll('transfers').findOne({ _id: oid(req.params.id) })
  if (!transfer || transfer.status === 'COMPLETED') return res.status(400).json({ error: 'Stage is not available' })
  const value = code()
  const expiresAt = new Date(Date.now() + 600000)
  await coll('verificationCodes').updateOne({ transferId: String(transfer._id), stage }, { $set: { codeHash: hash(value), codePreview: value, expiresAt, usedAt: null, sentAt: null } }, { upsert: true })
  res.json({ stage, code: value, expiresAt })
})
app.post('/api/admin/transfers/:id/notify', auth, adminOnly, async (req, res) => {
  const stage = Number(req.body.stage)
  const item = await coll('verificationCodes').findOne({ transferId: req.params.id, stage })
  const transfer = await coll('transfers').findOne({ _id: oid(req.params.id) })
  if (!item || item.usedAt || item.expiresAt < new Date() || !transfer) return res.status(400).json({ error: 'Generate a valid code first' })
  const body = `Your SMBC application verification code is: ${item.codePreview}. It expires in 10 minutes.`
  await coll('verificationCodes').updateOne({ _id: item._id }, { $set: { sentAt: new Date() } })
  await coll('notifications').insertOne({ userId: transfer.userId, title: `Verification Code · Stage ${stage}`, body, createdAt: new Date() })
  await coll('emailNotifications').insertOne({ userId: transfer.userId, transferId: String(transfer._id), subject: `SMBC verification · Stage ${stage}`, body, sentAt: new Date() })
  res.json({ sent: true })
})
app.get('/api/admin/audit-log', auth, adminOnly, async (_, res) => res.json((await coll('auditLogs').find({}).sort({ createdAt: -1 }).limit(100).toArray()).map(log => ({ ...log, id: String(log._id), adminId: log.adminId, action: log.action, entityType: log.entityType, entityId: log.entityId, createdAt: log.createdAt }))))
app.get('/api/admin/notifications', auth, adminOnly, async (_, res) => {
  const [emails, notifications] = await Promise.all([
    coll('emailNotifications').find({}).sort({ sentAt: -1 }).limit(50).toArray(),
    coll('notifications').find({}).sort({ createdAt: -1 }).limit(50).toArray(),
  ])
  const ids = [...new Set([...emails, ...notifications].map(item => item.userId).filter(Boolean))]
  const users = await coll('users').find({ _id: { $in: ids.map(oid) } }).toArray()
  const name = id => (users.find(u => String(u._id) === id) || {}).fullName || 'Unknown'
  res.json({
    emails: emails.map(item => ({ id: String(item._id), customer: name(item.userId), subject: item.subject, body: item.body, createdAt: item.sentAt })),
    notifications: notifications.map(item => ({ id: String(item._id), customer: name(item.userId), title: item.title, body: item.body, createdAt: item.createdAt })),
  })
})

const dashboardData = async userId => {
  const user = await coll('users').findOne({ _id: oid(userId) })
  const [accounts, transactions, notifications, transfers] = await Promise.all([
    coll('accounts').find({ userId: String(user._id) }).toArray(),
    coll('transactions').find({ userId: String(user._id) }).sort({ createdAt: -1 }).limit(20).toArray(),
    coll('notifications').find({ userId: String(user._id) }).sort({ createdAt: -1 }).limit(10).toArray(),
    coll('transfers').find({ userId: String(user._id) }).sort({ createdAt: -1 }).toArray(),
  ])
  return {
    user: { id: String(user._id), fullName: user.fullName, email: user.email },
    accounts: accounts.map(publicAccount),
    transactions: transactions.map(publicTransaction),
    notifications,
    transfers: transfers.map(publicTransfer),
    totalBalance: accounts.reduce((sum, account) => sum + account.balance, 0),
  }
}
app.get('/api/customer/dashboard', auth, customerOnly, async (req, res) => res.json(await dashboardData(req.user._id)))
app.get('/api/customer/accounts/:id', auth, customerOnly, async (req, res) => {
  const account = await coll('accounts').findOne({ _id: oid(req.params.id), userId: String(req.user._id) })
  if (!account) return res.status(404).json({ error: 'Account not found' })
  const transactions = await coll('transactions').find({ accountId: String(account._id) }).sort({ createdAt: -1 }).limit(20).toArray()
  res.json({ ...publicAccount(account), transactions: transactions.map(publicTransaction) })
})
app.get('/api/customer/notifications', auth, customerOnly, async (req, res) => res.json(await coll('notifications').find({ userId: String(req.user._id) }).sort({ createdAt: -1 }).toArray()))
app.post('/api/customer/transfers', auth, customerOnly, async (req, res) => {
  const amount = Number(req.body.amount)
  if (!req.body.recipientName || !req.body.bankName || !req.body.recipientAccount || !amount || amount <= 0) return res.status(400).json({ error: 'Complete all required transfer fields' })
  const account = await coll('accounts').findOne({ _id: oid(req.body.accountId), userId: String(req.user._id) })
  if (!account || account.balance < amount) return res.status(400).json({ error: 'Insufficient available balance' })
  const { insertedId } = await coll('transfers').insertOne({ userId: String(req.user._id), accountId: String(account._id), recipientName: req.body.recipientName, bankName: req.body.bankName, recipientAccount: req.body.recipientAccount, amount, fee: 0, currency: req.body.currency || 'JPY', message: req.body.message, status: 'VERIFICATION_REQUIRED', currentStage: 1, reference: reference(), createdAt: new Date() })
  res.json(publicTransfer(await coll('transfers').findOne({ _id: insertedId })))
})
app.get('/api/customer/transfers/:id', auth, customerOnly, async (req, res) => {
  const transfer = await coll('transfers').findOne({ _id: oid(req.params.id), userId: String(req.user._id) })
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' })
  res.json(publicTransfer(transfer))
})
app.post('/api/customer/transfers/:id/verify', auth, customerOnly, async (req, res) => {
  const transfer = await coll('transfers').findOne({ _id: oid(req.params.id), userId: String(req.user._id) })
  const stage = Number(req.body.stage)
  const item = await coll('verificationCodes').findOne({ transferId: String(transfer?._id), stage })
  if (!transfer || transfer.status === 'COMPLETED' || transfer.currentStage !== stage || !item || item.sentAt === null || item.usedAt || item.expiresAt < new Date() || item.codeHash !== hash(String(req.body.code || ''))) return res.status(400).json({ error: 'Invalid verification code' })
  if (stage === 4) {
    await coll('verificationCodes').updateOne({ _id: item._id }, { $set: { usedAt: new Date() } })
    await coll('transfers').updateOne({ _id: transfer._id }, { $set: { status: 'COMPLETED', currentStage: 5, completedAt: new Date() } })
    await coll('accounts').updateOne({ _id: oid(transfer.accountId) }, { $inc: { balance: -transfer.amount } })
    await coll('transactions').insertOne({ userId: transfer.userId, accountId: transfer.accountId, type: 'DEBIT', description: `Transfer to ${transfer.recipientName}`, senderName: transfer.recipientName, amount: -transfer.amount, currency: transfer.currency, status: 'COMPLETED', createdAt: new Date() })
    await coll('notifications').insertOne({ userId: transfer.userId, title: 'Transfer Completed', body: `¥${transfer.amount.toLocaleString()} sent to ${transfer.recipientName}. Reference ${transfer.reference}.`, createdAt: new Date() })
    return res.json({ status: 'COMPLETED' })
  }
  await coll('verificationCodes').updateOne({ _id: item._id }, { $set: { usedAt: new Date() } })
  await coll('transfers').updateOne({ _id: transfer._id }, { $set: { currentStage: stage + 1 } })
  res.json({ status: 'VERIFICATION_REQUIRED', currentStage: stage + 1 })
})

app.listen(port, () => console.log(`SMBC API listening on http://localhost:${port}`))

const publicUser = user => ({ id: String(user._id), fullName: user.fullName, email: user.email, phone: user.phone, status: user.status, createdAt: user.createdAt })
connect().catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1) })
