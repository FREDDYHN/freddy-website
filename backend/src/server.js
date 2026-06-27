import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { existsSync } from 'fs'
import { rename } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join as pathJoin } from 'path'
import { getDb, seedAdmin, closeDb } from './db.js'
import paymentRoutes from './payment.js'
import authRoutes from './auth.js'
import contractsRoutes from './routes/contracts.js'
import formsRoutes from './routes/forms.js'
import profileRoutes from './routes/profile.js'
import uploadsRoutes from './routes/uploads.js'
import { authMiddleware, adminMiddleware } from './auth.js'
import { checkReminders } from './services/reminders.js'
import { generateContract } from './services/contract-gen.js'
import { markPaid } from './payment.js'

const app = express()
const PORT = process.env.PORT || 3002

// ══════════════════════════════════════════════
//  Middleware
// ══════════════════════════════════════════════

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [
      'http://localhost:5173', 'http://localhost:3002', 'http://127.0.0.1:5173',
      'https://www.freddy-epr.com', 'https://freddy-epr.com',
      'https://www.freddy-epr.cn', 'https://freddy-epr.cn',
    ]
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (same-origin, curl, mobile) or from allowed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS[0] === '*') {
      cb(null, true)
    } else {
      console.warn(`[server] CORS blocked origin: ${origin}`)
      cb(null, false) // Deny CORS headers but don't reject the request itself
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

// Serve frontend static build
const __dirname = dirname(fileURLToPath(import.meta.url))
const rootPath = pathJoin(__dirname, '..', '..')
const distPath = pathJoin(rootPath, 'frontend', 'dist')
app.use(express.static(distPath, { maxAge: '1y', immutable: true }))

// Serve public contract templates + registration form templates
app.use('/projects', express.static(pathJoin(rootPath, 'projects', 'contracts'), { maxAge: '7d' }))
app.use('/templates', express.static(pathJoin(rootPath, 'templates'), { maxAge: '7d' }))

// ══════════════════════════════════════════════
//  API Routes
// ══════════════════════════════════════════════

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/contracts', contractsRoutes)
app.use('/api/forms', formsRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/uploads', uploadsRoutes)

// Serve generated contract files (auth + ownership verified)
app.get('/api/contracts/:id/download', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT client_id FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    // Verify ownership: client can only download their own contracts; admin can download any
    if (req.user.role !== 'admin' && contract.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const filePath = pathJoin(rootPath, 'projects', 'generated', req.query.file || '')
    if (!filePath.startsWith(pathJoin(rootPath, 'projects', 'generated'))) {
      return res.status(403).json({ error: 'Invalid path' })
    }
    if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found' })
    res.download(filePath)
  } catch (e) {
    console.error('[server] download error:', e)
    res.status(500).json({ error: e.message })
  }
})

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

// ── Admin Contracts (with pagination) ──
app.get('/api/admin/contracts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const perPage = Math.min(100, Math.max(10, parseInt(req.query.perPage) || 50))
    const offset = (page - 1) * perPage

    const [rows, countRow] = await Promise.all([
      db.all(
        'SELECT c.*, cl.company_name, cl.contact_email FROM contracts c JOIN clients cl ON c.client_id = cl.id ORDER BY c.id DESC LIMIT ? OFFSET ?',
        perPage, offset
      ),
      db.get('SELECT COUNT(*) as total FROM contracts'),
    ])

    res.json({
      data: rows,
      pagination: {
        page, perPage, total: countRow.total,
        totalPages: Math.ceil(countRow.total / perPage),
      },
    })
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

// ── Admin: Search clients (for 20,000+ scale) ──
app.get('/api/admin/clients/search', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const q = (req.query.q || '').trim()
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const perPage = Math.min(100, Math.max(10, parseInt(req.query.perPage) || 50))
    const offset = (page - 1) * perPage

    let rows, countRow
    if (q) {
      const like = `%${q}%`
      rows = await db.all(
        `SELECT * FROM clients WHERE company_name LIKE ? OR contact_name LIKE ? OR contact_email LIKE ?
         ORDER BY id DESC LIMIT ? OFFSET ?`,
        like, like, like, perPage, offset
      )
      countRow = await db.get(
        `SELECT COUNT(*) as total FROM clients WHERE company_name LIKE ? OR contact_name LIKE ? OR contact_email LIKE ?`,
        like, like, like
      )
    } else {
      rows = await db.all('SELECT * FROM clients ORDER BY id DESC LIMIT ? OFFSET ?', perPage, offset)
      countRow = await db.get('SELECT COUNT(*) as total FROM clients')
    }

    res.json({
      data: rows,
      pagination: { page, perPage, total: countRow.total, totalPages: Math.ceil(countRow.total / perPage) },
    })
  } catch (e) {
    console.error('[server] client search error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Export clients CSV (streaming — safe for 20,000+ rows) ──
app.get('/api/admin/clients/export', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const headers = ['公司名称','联系人','邮箱','电话','LUCID号','客户状态','注册日期','合同编号','套餐','合同状态','年费€']
    const dateStr = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="freddy-clients-${dateStr}.csv"`)
    res.write('﻿' + headers.join(',') + '\n') // BOM for Excel

    const BATCH = 500
    let offset = 0
    while (true) {
      const rows = await db.all(
        `SELECT cl.company_name, cl.contact_name, cl.contact_email, cl.contact_phone,
                cl.lucid_registration_number, cl.status as client_status, cl.created_at,
                c.contract_number, c.tier, c.status as contract_status, c.annual_fee_eur
         FROM clients cl
         LEFT JOIN contracts c ON c.client_id = cl.id AND c.id = (
           SELECT MAX(id) FROM contracts WHERE client_id = cl.id
         )
         ORDER BY cl.id DESC LIMIT ? OFFSET ?`,
        BATCH, offset
      )
      if (rows.length === 0) break

      for (const r of rows) {
        const vals = [
          r.company_name, r.contact_name, r.contact_email, r.contact_phone,
          r.lucid_registration_number, r.client_status, r.created_at,
          r.contract_number, r.tier, r.contract_status, r.annual_fee_eur,
        ].map(v => '"' + String(v || '').replace(/"/g, '""') + '"')
        res.write(vals.join(',') + '\n')
      }
      offset += BATCH
    }
    res.end()
  } catch (e) {
    console.error('[server] client export error:', e)
    if (!res.headersSent) res.status(500).json({ error: e.message })
    else res.end()
  }
})

// ── Contract Generation ──
app.post('/api/contracts/:id/generate', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get(
      `SELECT c.*, cl.company_name, cl.company_name_en, cl.contact_name, cl.contact_email,
              cl.contact_phone, cl.uscc, cl.registered_address, cl.legal_representative
       FROM contracts c JOIN clients cl ON c.client_id = cl.id WHERE c.id = ?`,
      req.params.id
    )
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    if (req.user.role === 'client' && contract.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { type, client_location } = req.body
    const genType = type || 'ar'

    const filePath = await generateContract({
      type: genType,
      clientLocation: client_location || 'cn',
      data: {
        ...contract,
        contract_date: contract.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        sign_date: new Date().toISOString().slice(0, 10),
        livanto_address: 'LIVANTO GmbH, Germany',
        livanto_register: 'HRB XXXX',
      },
    })

    const fileName = filePath.split('/').pop().split('\\').pop()
    res.json({
      success: true,
      download_url: `/api/contracts/${req.params.id}/download?file=${encodeURIComponent(fileName)}`,
      contract_number: contract.contract_number,
    })
  } catch (e) {
    console.error('[server] contract-gen error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Client: Notify payment (client self-reports bank transfer) ──
app.post('/api/payments/notify', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { contract_id } = req.body
    if (!contract_id) return res.status(400).json({ error: 'contract_id required' })

    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', contract_id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    if (req.user.client_id !== contract.client_id) return res.status(403).json({ error: 'Access denied' })
    if (contract.status !== 'pending_payment') return res.status(400).json({ error: 'Contract is not awaiting payment' })

    // Persist notification in DB for audit trail
    await db.run("UPDATE payments SET client_notified_at = datetime('now') WHERE contract_id = ? AND status = 'pending'", contract_id)
    console.log(`[server] Client ${req.user.email} reported payment for contract ${contract.contract_number} (id=${contract_id})`)
    res.json({ success: true, message: '已通知管理员，核对到账后将激活合同。' })
  } catch (e) {
    console.error('[server] payment notify error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Confirm bank transfer payment ──
app.post('/api/admin/payments/confirm', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { out_trade_no, contract_id } = req.body

    if (!out_trade_no && !contract_id) {
      return res.status(400).json({ error: 'out_trade_no or contract_id required' })
    }

    let payment
    if (out_trade_no) {
      payment = await db.get("SELECT * FROM payments WHERE out_trade_no = ? AND status = 'pending'", out_trade_no)
    } else {
      payment = await db.get("SELECT * FROM payments WHERE contract_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1", contract_id)
    }

    if (!payment) return res.status(404).json({ error: 'Payment not found or already processed' })

    try {
      await markPaid(payment.out_trade_no)
      console.log(`[server] Admin confirmed payment: ${payment.out_trade_no}, contract ${payment.contract_id} activated`)
      res.json({ success: true, payment_id: payment.id, contract_activated: true })
    } catch (e) {
      console.error('[server] admin payment confirm error:', e)
      res.status(500).json({ error: e.message })
    }
  } catch (e) {
    console.error('[server] admin payment confirm error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Upload stamped contract for a client ──
const adminUpload = multer({ dest: pathJoin(rootPath, 'uploads'), limits: { fileSize: 20 * 1024 * 1024 } })
app.post('/api/admin/uploads', authMiddleware, adminMiddleware, adminUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' })
    const db = await getDb()
    const { client_id, contract_id, file_type } = req.body
    if (!client_id) return res.status(400).json({ error: 'client_id required' })

    const safeName = `${Date.now()}-admin-${req.file.originalname.replace(/[^a-zA-Z0-9._\-一-龥]/g, '_')}`
    const newPath = pathJoin(rootPath, 'uploads', safeName)
    await rename(req.file.path, newPath)

    await db.run(
      'INSERT INTO uploads (client_id, contract_id, file_type, original_name, stored_path, file_size, mime_type) VALUES (?,?,?,?,?,?,?)',
      client_id, contract_id || null, file_type || 'admin_stamped', req.file.originalname, safeName, req.file.size, req.file.mimetype
    )
    res.status(201).json({ success: true, file: { original_name: req.file.originalname, stored_path: safeName } })
  } catch (e) {
    console.error('[server] admin upload error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Bank Transfer Info (public) ──
app.get('/api/bank-info', (_req, res) => {
  res.json({
    bank_name: 'Bank of China',
    account_name: '福瑞笛（上海）信息咨询有限公司淮南分公司',
    account_number: process.env.BANK_ACCOUNT || '（请联系客服获取）',
    swift: 'BKCHCNBJXXX',
    reference_prefix: 'EPR-',
    note: '请在转账附言中注明合同编号或公司名称，以便我们快速确认到账。',
  })
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
    res.sendFile(pathJoin(distPath, 'index.html'))
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
  const server = app.listen(PORT, () => {
    console.log(`[server] Freddy EPR Platform running on http://localhost:${PORT}`)
    console.log(`[server] CORS origins: ${ALLOWED_ORIGINS.join(', ')}`)
  })

  // Graceful shutdown — close DB so WAL is checkpointed cleanly
  const shutdown = async (signal) => {
    console.log(`[server] Received ${signal}, shutting down...`)
    await new Promise(resolve => server.close(resolve))
    await closeDb()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
start()
