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

// Middleware
app.use(cors())
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

// API Routes
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/contracts', contractsRoutes)
app.use('/api/forms', formsRoutes)

// Admin routes
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const clients = await db.get('SELECT COUNT(*) as cnt FROM clients')
    const contracts = await db.get("SELECT COUNT(*) as cnt FROM contracts WHERE status = 'active'")
    const pending = await db.get("SELECT COUNT(*) as cnt FROM payments WHERE status = 'pending'")
    const revenue = await db.get("SELECT COALESCE(SUM(amount_eur),0) as total FROM payments WHERE status = 'paid'")
    res.json({
      total_clients: clients.cnt, active_contracts: contracts.cnt,
      pending_payments: pending.cnt, annual_revenue_eur: revenue.total,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/admin/contracts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const rows = await db.all('SELECT c.*, cl.company_name, cl.contact_email FROM contracts c JOIN clients cl ON c.client_id = cl.id ORDER BY c.id DESC')
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/reminders/check', authMiddleware, adminMiddleware, async (req, res) => {
  try { await checkReminders(); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(join(distPath, 'index.html'))
  } else {
    res.status(404).json({ error: 'Not found' })
  }
})

// Start
async function start() {
  await getDb()
  await seedAdmin()
  app.listen(PORT, () => {
    console.log(`[server] Freddy EPR Platform running on http://localhost:${PORT}`)
  })
}
start()
