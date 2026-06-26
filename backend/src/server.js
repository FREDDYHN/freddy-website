import express from 'express'
import cors from 'cors'
import { getDb, seedAdmin } from './db.js'
import paymentRoutes from './payment.js'
import authRoutes from './auth.js'
import contractsRoutes from './routes/contracts.js'
import formsRoutes from './routes/forms.js'
import { authMiddleware, adminMiddleware } from './auth.js'
import { checkReminders } from './services/reminders.js'

const app = express()
const PORT = process.env.PORT || 3002

// ══════════════════════════════════════════════
//  Middleware
// ══════════════════════════════════════════════

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3002', 'http://127.0.0.1:5173']
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS[0] === '*') {
      cb(null, true)
    } else {
      console.warn(`[server] CORS blocked origin: ${origin}`)
      cb(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())

// Serve frontend static build
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))
const rootPath = join(__dirname, '..', '..')
const distPath = join(rootPath, 'frontend', 'dist')
app.use(express.static(distPath, { maxAge: '1y', immutable: true }))

// Serve static files from project root (contracts, templates)
app.use('/projects', express.static(join(rootPath, 'projects'), { maxAge: '7d' }))
app.use('/templates', express.static(join(rootPath, 'templates'), { maxAge: '7d' }))

// ══════════════════════════════════════════════
//  API Routes
// ══════════════════════════════════════════════

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/contracts', contractsRoutes)
app.use('/api/forms', formsRoutes)

// ── Client Dashboard ──
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const clientId = req.user.client_id

    const client = await db.get('SELECT * FROM clients WHERE id = ?', clientId)
    if (!client) return res.status(404).json({ error: 'Client not found' })

    const contracts = await db.all(
      'SELECT * FROM contracts WHERE client_id = ? ORDER BY id DESC', clientId
    )
    const packaging = contracts.length > 0
      ? await db.all('SELECT * FROM packaging_data WHERE contract_id = ?', contracts[0].id)
      : []
    const payments = await db.all(
      'SELECT * FROM payments WHERE client_id = ? ORDER BY id DESC', clientId
    )
    const invoices = await db.all(
      'SELECT * FROM invoices WHERE client_id = ? ORDER BY id DESC', clientId
    )

    res.json({ success: true, data: { client, contracts, packaging, payments, invoices } })
  } catch (e) {
    console.error('[server] dashboard error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin Stats ──
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const [clients, contracts, pending, revenue] = await Promise.all([
      db.get('SELECT COUNT(*) as cnt FROM clients'),
      db.get("SELECT COUNT(*) as cnt FROM contracts WHERE status = 'active'"),
      db.get("SELECT COUNT(*) as cnt FROM payments WHERE status = 'pending'"),
      db.get("SELECT COALESCE(SUM(amount_eur),0) as total FROM payments WHERE status = 'paid'"),
    ])
    res.json({
      total_clients: clients.cnt, active_contracts: contracts.cnt,
      pending_payments: pending.cnt, annual_revenue_eur: revenue.total,
    })
  } catch (e) {
    console.error('[server] admin stats error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin Contracts ──
app.get('/api/admin/contracts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const rows = await db.all(
      'SELECT c.*, cl.company_name, cl.contact_email FROM contracts c JOIN clients cl ON c.client_id = cl.id ORDER BY c.id DESC'
    )
    res.json(rows)
  } catch (e) {
    console.error('[server] admin contracts error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin Reminders ──
app.get('/api/admin/reminders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const rows = await db.all(
      "SELECT r.*, c.contract_number FROM reminders r JOIN contracts c ON r.contract_id = c.id ORDER BY r.due_date DESC"
    )
    res.json(rows)
  } catch (e) {
    console.error('[server] admin reminders error:', e)
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/admin/reminders/check', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await checkReminders()
    res.json({ success: true })
  } catch (e) {
    console.error('[server] reminder check error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ══════════════════════════════════════════════
//  Unified Error Handler
// ══════════════════════════════════════════════
app.use((err, req, res, _next) => {
  console.error(`[server] Unhandled error on ${req.method} ${req.path}:`, err.message)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

// ══════════════════════════════════════════════
//  SPA Fallback
// ══════════════════════════════════════════════
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(join(distPath, 'index.html'))
  } else {
    res.status(404).json({ error: 'Not found' })
  }
})

// ══════════════════════════════════════════════
//  Start
// ══════════════════════════════════════════════
async function start() {
  await getDb()
  await seedAdmin()
  app.listen(PORT, () => {
    console.log(`[server] Freddy EPR Platform running on http://localhost:${PORT}`)
    console.log(`[server] CORS origins: ${ALLOWED_ORIGINS.join(', ')}`)
  })
}
start()
