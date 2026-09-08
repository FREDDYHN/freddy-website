import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import multer from 'multer'
import { existsSync, readFileSync, mkdirSync } from 'fs'
import { rename } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join as pathJoin } from 'path'
import { getDb, getRate, setRate, seedAdmin, closeDb, withTransaction } from './db.js'
import { startRateFetcher, fetchAndSave } from './services/rate-fetcher.js'
import paymentRoutes from './payment.js'
import authRoutes from './auth.js'
import contractsRoutes from './routes/contracts.js'
import formsRoutes from './routes/forms.js'
import profileRoutes from './routes/profile.js'
import uploadsRoutes from './routes/uploads.js'
import notificationsRoutes from './routes/notifications.js'
import adminNotificationsRoutes from './routes/admin-notifications.js'
import exportRoutes from './routes/exports.js'
import { authMiddleware, adminMiddleware } from './auth.js'
import { checkReminders, startReminderScheduler } from './services/reminders.js'
import { generateContract } from './services/contract-gen.js'
import { docxToPdf } from './services/pdf.js'
import { decryptLucid } from './services/crypto.js'
import { markPaid } from './payment.js'
import { rateLimit } from './rate-limiter.js'
import { localDate, beijingDateFromUtc } from './services/date.js'
import { sendTaxNumberRequest, sendLucidNumberRequest, sendLucidAcceptanceReminder, sendInboundForward } from './services/email.js'
import { startInboundScheduler, pollInbox } from './services/inbound-email.js'
import { taxError } from '../../shared/constants.js'

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
app.use(express.static(distPath, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    }
  },
}))

// Serve public contract templates + registration form templates
app.use('/projects', express.static(pathJoin(rootPath, 'projects', 'contracts'), { maxAge: '7d' }))
app.use('/projects/generated', express.static(pathJoin(rootPath, 'projects', 'generated'), { maxAge: '1h' }))
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
app.use('/api/notifications', notificationsRoutes)
app.use('/api/admin', adminNotificationsRoutes)
app.use('/api/admin/export', exportRoutes)

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
    delete client.lucid_password_enc

    const contracts = await db.all(
      'SELECT * FROM contracts WHERE client_id = ? ORDER BY id DESC', clientId
    )
    const packaging = contracts.length > 0
      ? await db.all(
          `SELECT pd.* FROM packaging_data pd
           JOIN contracts c ON pd.contract_id = c.id
           WHERE c.client_id = ?
           ORDER BY c.start_date DESC, pd.material_type`,
          clientId
        )
      : []
    const payments = await db.all(
      'SELECT * FROM payments WHERE client_id = ? ORDER BY id DESC', clientId
    )
    const invoices = await db.all(
      'SELECT * FROM invoices WHERE client_id = ? ORDER BY id DESC', clientId
    )
    const reminders = await db.all(
      `SELECT r.*, c.contract_number FROM reminders r
       JOIN contracts c ON r.contract_id = c.id
       WHERE c.client_id = ? AND r.status = 'pending'
       ORDER BY r.due_date ASC`,
      clientId
    )
    const recyclingFees = await db.all(
      `SELECT * FROM payments WHERE client_id = ?
       AND payment_type IN ('recycling_prepaid', 'recycling_settlement')
       ORDER BY id DESC`,
      clientId
    )
    const unread = await db.get(
      'SELECT COUNT(*) as cnt FROM notifications WHERE client_id = ? AND is_read = 0',
      clientId
    )

    res.json({ success: true, data: { client, contracts, packaging, payments, invoices, reminders, recycling_fees: recyclingFees, unread_notifications: unread.cnt } })
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
      db.get("SELECT COUNT(*) as cnt FROM payments p JOIN contracts c ON p.contract_id = c.id WHERE p.status = 'pending' AND c.status != 'pending_verification'"),
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
// Default: exclude pending_verification. Pass ?include=all to see everything.
app.get('/api/admin/contracts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const perPage = Math.min(100, Math.max(10, parseInt(req.query.perPage) || 50))
    const offset = (page - 1) * perPage
    const showAll = req.query.include === 'all'

    const whereClause = showAll ? '' : "WHERE c.status != 'pending_verification'"
    const [rows, countRow] = await Promise.all([
      db.all(
        `SELECT c.*, cl.company_name, cl.company_name_en, cl.contact_name, cl.contact_email, cl.contact_phone, cl.registered_address, cl.entity_type, cl.uscc, cl.id_number, cl.country, cl.vat_id, cl.legal_representative, cl.wechat_id, cl.lucid_registration_number, cl.lucid_login FROM contracts c JOIN clients cl ON c.client_id = cl.id ${whereClause} ORDER BY c.id DESC LIMIT ? OFFSET ?`,
        perPage, offset
      ),
      db.get(`SELECT COUNT(*) as total FROM contracts c ${whereClause}`),
    ])

    // Enrich with payment info + uploads (batch query to avoid N+1)
    const contractIds = rows.map(r => r.id)
    const [allPayments, allUploads, allPackaging] = await Promise.all([
      contractIds.length > 0
        ? db.all(`SELECT * FROM payments WHERE contract_id IN (${contractIds.map(() => '?').join(',')}) ORDER BY id DESC`, ...contractIds)
        : [],
      contractIds.length > 0
        ? db.all(`SELECT * FROM uploads WHERE contract_id IN (${contractIds.map(() => '?').join(',')}) ORDER BY uploaded_at DESC`, ...contractIds)
        : [],
      contractIds.length > 0
        ? db.all(`SELECT * FROM packaging_data WHERE contract_id IN (${contractIds.map(() => '?').join(',')})`, ...contractIds)
        : [],
    ])

    const paymentsByContract = {}
    for (const p of allPayments) {
      if (!paymentsByContract[p.contract_id]) paymentsByContract[p.contract_id] = []
      paymentsByContract[p.contract_id].push(p)
    }
    const uploadsByContract = {}
    for (const u of allUploads) {
      if (!uploadsByContract[u.contract_id]) uploadsByContract[u.contract_id] = {}
      if (!uploadsByContract[u.contract_id][u.file_type]) uploadsByContract[u.contract_id][u.file_type] = []
      uploadsByContract[u.contract_id][u.file_type].push(u)
    }

    for (const row of rows) {
      const pms = paymentsByContract[row.id] || []
      const prepaid = pms.find(p => p.payment_type === 'recycling_prepaid')
      if (prepaid) { row.prepaid_amount = prepaid.amount_eur; row.prepaid_status = prepaid.status }
      const settlement = pms.find(p => p.payment_type === 'recycling_settlement')
      if (settlement) { row.settlement_amount = settlement.amount_eur; row.settlement_status = settlement.status }
      row._uploads = uploadsByContract[row.id] || {}
      row._packaging = allPackaging.filter(p => p.contract_id === row.id)
    }

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
        `SELECT cl.*, c.id as contract_id, c.contract_number, c.tier, c.annual_fee_eur, c.status as contract_status, c.start_date, c.end_date, c.lucid_confirmed, c.lucid_rep_accepted, c.pre_declared_status
         FROM clients cl LEFT JOIN contracts c ON c.client_id = cl.id
         WHERE cl.company_name LIKE ? OR cl.company_name_en LIKE ? OR cl.contact_name LIKE ? OR cl.contact_email LIKE ? OR cl.contact_phone LIKE ? OR cl.legal_representative LIKE ? OR c.contract_number LIKE ?
         ORDER BY cl.id DESC LIMIT ? OFFSET ?`,
        like, like, like, like, like, like, like, perPage, offset
      )
      countRow = await db.get(
        `SELECT COUNT(*) as total FROM clients cl LEFT JOIN contracts c ON c.client_id = cl.id WHERE cl.company_name LIKE ? OR cl.company_name_en LIKE ? OR cl.contact_name LIKE ? OR cl.contact_email LIKE ? OR cl.contact_phone LIKE ? OR cl.legal_representative LIKE ? OR c.contract_number LIKE ?`,
        like, like, like, like, like, like, like
      )
    } else {
      rows = await db.all('SELECT * FROM clients ORDER BY id DESC LIMIT ? OFFSET ?', perPage, offset)
      countRow = await db.get('SELECT COUNT(*) as total FROM clients')
    }

    // 富化：与 /api/admin/contracts 一致，补 payments/uploads/packaging（预缴/结算金额、凭证、材料）
    const contractIds = rows.map(r => r.contract_id).filter(Boolean)
    if (contractIds.length > 0) {
      const ph = contractIds.map(() => '?').join(',')
      const [allPayments, allUploads, allPackaging] = await Promise.all([
        db.all(`SELECT * FROM payments WHERE contract_id IN (${ph}) ORDER BY id DESC`, ...contractIds),
        db.all(`SELECT * FROM uploads WHERE contract_id IN (${ph}) ORDER BY uploaded_at DESC`, ...contractIds),
        db.all(`SELECT * FROM packaging_data WHERE contract_id IN (${ph})`, ...contractIds),
      ])
      const payByContract = {}, uplByContract = {}
      for (const p of allPayments) {
        if (!payByContract[p.contract_id]) payByContract[p.contract_id] = []
        payByContract[p.contract_id].push(p)
      }
      for (const u of allUploads) {
        if (!uplByContract[u.contract_id]) uplByContract[u.contract_id] = {}
        if (!uplByContract[u.contract_id][u.file_type]) uplByContract[u.contract_id][u.file_type] = []
        uplByContract[u.contract_id][u.file_type].push(u)
      }
      for (const r of rows) {
        const cid = r.contract_id
        if (!cid) continue
        const pms = payByContract[cid] || []
        const prepaid = pms.find(p => p.payment_type === 'recycling_prepaid')
        if (prepaid) { r.prepaid_amount = prepaid.amount_eur; r.prepaid_status = prepaid.status }
        const settlement = pms.find(p => p.payment_type === 'recycling_settlement')
        if (settlement) { r.settlement_amount = settlement.amount_eur; r.settlement_status = settlement.status }
        r._uploads = uplByContract[cid] || {}
        r._packaging = allPackaging.filter(p => p.contract_id === cid)
      }
    }

    for (const r of rows) delete r.lucid_password_enc

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
    const headers = ['公司名称','联系人','邮箱','电话','LUCID号','客户状态','注册日期','合同编号','套餐','合同状态','年费€','年费状态','回收费预缴€','回收费预缴状态','年终结算€','年终结算状态']
    const dateStr = localDate()
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="freddy-clients-${dateStr}.csv"`)
    res.write('﻿' + headers.join(',') + '\n') // BOM for Excel

    const BATCH = 500
    let offset = 0
    while (true) {
      const rows = await db.all(
        `SELECT cl.company_name, cl.contact_name, cl.contact_email, cl.contact_phone,
                cl.lucid_registration_number, cl.status as client_status, cl.created_at,
                c.id as contract_id, c.contract_number, c.tier, c.status as contract_status, c.annual_fee_eur
         FROM clients cl
         LEFT JOIN contracts c ON c.client_id = cl.id AND c.id = (
           SELECT MAX(id) FROM contracts WHERE client_id = cl.id
         )
         ORDER BY cl.id DESC LIMIT ? OFFSET ?`,
        BATCH, offset
      )
      if (rows.length === 0) break

      // 批量取各合同的付款（年费/回收费预缴/年终结算），避免 N+1
      const contractIds = rows.map(r => r.contract_id).filter(Boolean)
      const allPayments = contractIds.length > 0
        ? await db.all(
            `SELECT contract_id, payment_type, amount_eur, status FROM payments WHERE contract_id IN (${contractIds.map(() => '?').join(',')}) ORDER BY id DESC`,
            ...contractIds
          )
        : []
      const payByContract = {}
      for (const p of allPayments) {
        if (!payByContract[p.contract_id]) payByContract[p.contract_id] = {}
        if (!payByContract[p.contract_id][p.payment_type]) payByContract[p.contract_id][p.payment_type] = p
      }
      const statusLabel = (p) => !p ? '' : (p.status === 'paid' ? '已付' : '待付')

      for (const r of rows) {
        const pm = payByContract[r.contract_id] || {}
        const fee = pm.contract_fee
        const prepaid = pm.recycling_prepaid
        const settle = pm.recycling_settlement
        const vals = [
          r.company_name, r.contact_name, r.contact_email, r.contact_phone,
          r.lucid_registration_number, r.client_status, r.created_at,
          r.contract_number, r.tier, r.contract_status, r.annual_fee_eur,
          statusLabel(fee),
          prepaid ? prepaid.amount_eur : '',
          statusLabel(prepaid),
          settle ? settle.amount_eur : '',
          statusLabel(settle),
        ].map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"')
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

// ── Admin: Decrypt LUCID password (for acting on behalf of customer) ──
app.get('/api/admin/clients/:id/lucid-password', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const client = await db.get('SELECT lucid_login, lucid_password_enc FROM clients WHERE id = ?', req.params.id)
    if (!client) return res.status(404).json({ error: 'Client not found' })
    res.json({
      success: true,
      login: client.lucid_login || '',
      password: client.lucid_password_enc ? decryptLucid(client.lucid_password_enc) : '',
    })
  } catch (e) {
    console.error('[server] lucid password error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: List Applications (WEEE/Battery) ──
app.get('/api/admin/applications', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const rows = await db.all(
      `SELECT a.*, cl.company_name, cl.contact_email, cl.company_name_en,
              cl.registered_address, cl.registered_address_en,
              cl.legal_representative, cl.legal_representative_en,
              cl.contact_name, cl.contact_phone, cl.wechat_id, cl.lucid_registration_number
       FROM applications a
       LEFT JOIN clients cl ON a.client_id = cl.id
       ORDER BY a.id DESC LIMIT 100`
    )
    res.json(rows)
  } catch (e) {
    console.error('[server] applications error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Set Recycling Fee ──
app.post('/api/admin/set-fee', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { contract_id, fee_type, amount_eur } = req.body
    if (!contract_id || !fee_type || amount_eur == null) return res.status(400).json({ error: 'contract_id, fee_type, amount_eur required' })

    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', contract_id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })

    const paymentType = fee_type === 'prepaid' ? 'recycling_prepaid' : 'recycling_settlement'

    // Check if payment already exists
    const existing = await db.get(
      'SELECT * FROM payments WHERE contract_id = ? AND payment_type = ?',
      contract_id, paymentType
    )

    if (existing) {
      await db.run('UPDATE payments SET amount_eur = ?, status = ? WHERE id = ?',
        amount_eur, 'pending', existing.id)
    } else {
      const tradeNo = 'EPR-' + paymentType.toUpperCase() + '-' + Date.now().toString(36).toUpperCase()
      await db.run(
        'INSERT INTO payments (client_id, contract_id, payment_type, amount_eur, out_trade_no, status) VALUES (?, ?, ?, ?, ?, ?)',
        contract.client_id, contract_id, paymentType, amount_eur, tradeNo, 'pending'
      )
    }

    res.json({ success: true, contract_id, fee_type, amount_eur })
  } catch (e) {
    console.error('[server] set-fee error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Contract Generation ──
app.post('/api/contracts/:id/generate', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get(
      `SELECT c.*, cl.company_name, cl.company_name_en, cl.contact_name, cl.contact_name_en, cl.contact_email,
              cl.contact_phone, cl.uscc, cl.registered_address, cl.registered_address_en,
              cl.registered_address as company_address,
              cl.legal_representative, cl.legal_representative_en,
              cl.wechat_id
       FROM contracts c JOIN clients cl ON c.client_id = cl.id WHERE c.id = ?`,
      req.params.id
    )
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    if (req.user.role === 'client' && contract.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Fetch packaging data for Anlage B
    const packagingItems = await db.all(
      'SELECT material_type, packaging_category, example, estimated_quantity_kg FROM packaging_data WHERE contract_id = ?',
      req.params.id
    )
    const pkgItems = packagingItems.map(p => ({
      material: p.material_type,
      category: p.packaging_category,
      kg: String(p.estimated_quantity_kg || ''),
      example: p.example || '',
    }))

    const { type, client_location } = req.body
    const genType = type || 'ar'

    const filePath = await generateContract({
      type: genType,
      clientLocation: client_location || 'cn',
      data: {
        ...contract,
        packaging_items: pkgItems,
        contract_date: beijingDateFromUtc(contract.created_at),
        sign_date: localDate(),
      },
    })

    // 生成 PDF 版本（防篡改），PDF 作为正式交付格式
    const pdfPath = await docxToPdf(filePath)
    const pdfName = pdfPath.split('/').pop().split('\\').pop()
    res.json({
      success: true,
      pdf_url: `/api/contracts/${req.params.id}/download?file=${encodeURIComponent(pdfName)}`,
      contract_number: contract.contract_number,
    })
  } catch (e) {
    console.error('[server] contract-gen error:', e)
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

// ── Public: Contact form (rate limited: 3 per 10 min per IP) ──
app.post('/api/contact', rateLimit('contact-form', 3, 10 * 60 * 1000), async (req, res) => {
  try {
    const { name, email, message } = req.body
    if (!name || !email || !message) return res.status(400).json({ error: 'All fields required' })
    console.log(`[contact] ${name} <${email}>: ${message}`)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Admin: Update client tax identifier (entity_type / uscc / id_number) ──
app.patch('/api/admin/clients/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { entity_type, uscc, id_number } = req.body
    const entityType = entity_type === 'individual' ? 'individual' : 'company'
    const client = await db.get('SELECT id, country FROM clients WHERE id = ?', req.params.id)
    if (!client) return res.status(404).json({ error: 'Client not found' })
    const countryCode = (client.country || 'CN').toUpperCase()
    const taxValue = entityType === 'individual' ? id_number : uscc
    const taxErr = taxError(countryCode, entityType, taxValue)
    if (taxErr) return res.status(400).json({ error: taxErr })
    await db.run(
      "UPDATE clients SET entity_type = ?, uscc = ?, id_number = ?, updated_at = datetime('now') WHERE id = ?",
      entityType, uscc ? String(uscc).trim() : '', id_number ? String(id_number).trim() : '', req.params.id
    )
    res.json({ success: true, entity_type: entityType, uscc: uscc || '', id_number: id_number || '' })
  } catch (e) {
    console.error('[server] update client tax error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Update client LUCID 注册号（直填，配合 LUCID 里 Annehmen 时回填）──
app.patch('/api/admin/clients/:id/lucid', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { lucid_registration_number } = req.body
    const regNo = (lucid_registration_number || '').trim()
    if (!regNo) return res.status(400).json({ error: 'LUCID 注册号必填' })
    const client = await db.get('SELECT id FROM clients WHERE id = ?', req.params.id)
    if (!client) return res.status(404).json({ error: 'Client not found' })
    await db.run(
      "UPDATE clients SET lucid_registration_number = ?, updated_at = datetime('now') WHERE id = ?",
      regNo, req.params.id
    )
    res.json({ success: true, lucid_registration_number: regNo })
  } catch (e) {
    console.error('[server] update lucid number error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Remind clients missing tax number (in-app notification + email) ──
app.post('/api/admin/remind-missing-tax', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const missing = await db.all(
      `SELECT cl.id, cl.company_name, cl.contact_name, cl.contact_email, cl.entity_type
       FROM clients cl
       JOIN contracts c ON c.client_id = cl.id
       WHERE c.status != 'pending_verification'
         AND ((cl.entity_type = 'individual' AND (cl.id_number IS NULL OR cl.id_number = ''))
              OR (cl.entity_type != 'individual' AND (cl.uscc IS NULL OR cl.uscc = '')))
       GROUP BY cl.id`
    )
    let notified = 0
    for (const cl of missing) {
      try {
        await db.run(
          `INSERT INTO notifications (client_id, contract_id, type, title, message) VALUES (?, NULL, 'admin_message', ?, ?)`,
          cl.id, '⚠️ 请补充税号', '为完成预申报，请登录「账户管理」补充您的税号（公司：统一社会信用代码；个人：身份证号码）。'
        )
        await sendTaxNumberRequest({ email: cl.contact_email, name: cl.contact_name || cl.company_name })
        notified++
      } catch (e) {
        console.error(`[server] remind-missing-tax failed for client ${cl.id}:`, e.message)
      }
    }
    res.json({ success: true, reminded: notified, total: missing.length })
  } catch (e) {
    console.error('[server] remind-missing-tax error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Remind clients missing LUCID 注册号 (in-app notification + email) ──
app.post('/api/admin/remind-missing-lucid', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const missing = await db.all(
      `SELECT cl.id, cl.company_name, cl.contact_name, cl.contact_email
       FROM clients cl
       JOIN contracts c ON c.client_id = cl.id
       WHERE c.status != 'pending_verification'
         AND (cl.lucid_registration_number IS NULL OR trim(cl.lucid_registration_number) = '')
       GROUP BY cl.id`
    )
    let notified = 0
    for (const cl of missing) {
      try {
        await db.run(
          `INSERT INTO notifications (client_id, contract_id, type, title, message) VALUES (?, NULL, 'admin_message', ?, ?)`,
          cl.id, '⚠️ 请补充 LUCID 注册号', '为完成授权代表注册（提交双元系统），请进入「面板」→「LUCID 授权」卡片，填写您的 LUCID 注册号（DE 开头）、LUCID 登录邮箱和密码。'
        )
        await sendLucidNumberRequest({ email: cl.contact_email, name: cl.contact_name || cl.company_name })
        notified++
      } catch (e) {
        console.error(`[server] remind-missing-lucid failed for client ${cl.id}:`, e.message)
      }
    }
    res.json({ success: true, reminded: notified, total: missing.length })
  } catch (e) {
    console.error('[server] remind-missing-lucid error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Remind clients to complete the 4 prerequisites for LUCID acceptance (in-app notification + email) ──
app.post('/api/admin/remind-lucid-acceptance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    // 未完成 4 点中任一点的客户：回签 / 年费 / 预申报费(代缴 或 自行预申报) / LUCID 密码
    const missing = await db.all(
      `SELECT cl.id, cl.company_name, cl.contact_name, cl.contact_email
       FROM clients cl
       JOIN contracts c ON c.client_id = cl.id
       WHERE c.status != 'pending_verification'
         AND (c.is_spam IS NULL OR c.is_spam = 0)
         AND (
           c.id NOT IN (SELECT DISTINCT contract_id FROM uploads WHERE file_type = 'admin_stamped')
           OR c.status != 'active'
           OR NOT (
             c.id IN (SELECT contract_id FROM payments WHERE payment_type = 'recycling_prepaid' AND status = 'paid')
             OR c.pre_declared_status = 'approved'
           )
           OR cl.lucid_password_enc IS NULL OR trim(cl.lucid_password_enc) = ''
         )
       GROUP BY cl.id`
    )
    let notified = 0
    for (const cl of missing) {
      try {
        await db.run(
          `INSERT INTO notifications (client_id, contract_id, type, title, message) VALUES (?, NULL, 'admin_message', ?, ?)`,
          cl.id, '⚠️ 请完成授权代表确认的 4 项事项',
          '为确保授权代表在 LUCID 被接受，请完成：合同签订（回签）、年费缴纳、预申报费缴纳、LUCID 账号密码提交。已完成请忽略。'
        )
        await sendLucidAcceptanceReminder({ email: cl.contact_email, name: cl.contact_name || cl.company_name })
        notified++
      } catch (e) {
        console.error(`[server] remind-lucid-acceptance failed for client ${cl.id}:`, e.message)
      }
    }
    res.json({ success: true, reminded: notified, total: missing.length })
  } catch (e) {
    console.error('[server] remind-lucid-acceptance error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Reset client password ──
app.post('/api/admin/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { client_id } = req.body
    if (!client_id) return res.status(400).json({ error: 'client_id required' })
    const user = await db.get('SELECT * FROM users WHERE client_id = ?', client_id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    const newPw = Math.random().toString(36).slice(2, 10)
    const hash = await bcrypt.hash(newPw, 10)
    await db.run('UPDATE users SET password_hash = ? WHERE client_id = ?', hash, client_id)
    res.json({ success: true, new_password: newPw })
  } catch (e) {
    console.error('[server] reset password error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Upload stamped contract for a client ──
const adminUpload = multer({ dest: pathJoin(rootPath, 'uploads'), limits: { fileSize: 100 * 1024 * 1024 } })
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

// ── Exchange Rate ──
// Public: get current settlement rate
app.get('/api/rate', async (_req, res) => {
  try {
    const d = await getDb()
    const row = await d.get("SELECT value, updated_at FROM settings WHERE key = 'eur_cny_rate'")
    res.json({
      rate: parseFloat(row?.value) || 8.10,
      updated_at: row?.updated_at || null,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Admin: get rate detail
app.get('/api/admin/rate', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const d = await getDb()
    const row = await d.get("SELECT value, updated_at FROM settings WHERE key = 'eur_cny_rate'")
    res.json({
      rate: parseFloat(row?.value) || 8.10,
      updated_at: row?.updated_at || null,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Admin: set rate manually
app.post('/api/admin/rate', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rate } = req.body
    if (!rate || isNaN(rate) || rate <= 0) return res.status(400).json({ error: 'Invalid rate' })
    const newRate = await setRate(parseFloat(rate), 'manual')
    res.json({ success: true, rate: newRate })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Admin: trigger rate fetch now
app.post('/api/admin/rate/fetch', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const newRate = await fetchAndSave()
    res.json({ success: true, rate: newRate })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Bank Transfer Info (public) ──
app.get('/api/bank-info', (_req, res) => {
  res.json({
    bank_name: '中国银行股份有限公司淮南分行',
    bank_address: '安徽省淮南市龙湖路21号',
    bank_code: 'BKCHCNBJ780',
    account_name: '福瑞笛（上海）信息咨询有限公司淮南分公司',
    account_number: process.env.BANK_ACCOUNT || '181276312093',
    swift: 'BKCHCNBJ780',
    company_address: '安徽省淮南市中环国际广场158金融中心四层418室',
    company_tax_id: '91340400MADDK97K4X',
    reference_prefix: 'EPR-',
    note: '请在转账附言中注明合同编号或公司名称，以便我们快速确认到账。',
  })
})

// ── Admin: Toggle spam flag on contract ──
app.post('/api/admin/contracts/:id/spam', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT id, is_spam FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    const newVal = contract.is_spam ? 0 : 1
    await db.run('UPDATE contracts SET is_spam = ? WHERE id = ?', newVal, req.params.id)
    res.json({ success: true, contract_id: parseInt(req.params.id), is_spam: !!newVal })
  } catch (e) {
    console.error('[server] spam toggle error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Toggle LIVANTO LUCID「Annehmen（接受）」状态（手动同步）──
app.post('/api/admin/contracts/:id/lucid-annehmen', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT id, lucid_rep_accepted FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    const newVal = contract.lucid_rep_accepted ? 0 : 1
    await db.run(
      "UPDATE contracts SET lucid_rep_accepted = ?, lucid_rep_accepted_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END WHERE id = ?",
      newVal, newVal, req.params.id
    )
    res.json({ success: true, contract_id: parseInt(req.params.id), lucid_rep_accepted: !!newVal })
  } catch (e) {
    console.error('[server] lucid-annehmen toggle error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Delete contract ──
app.delete('/api/admin/contracts/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT id FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    await db.run('DELETE FROM payments WHERE contract_id = ?', req.params.id)
    await db.run('DELETE FROM packaging_data WHERE contract_id = ?', req.params.id)
    await db.run('DELETE FROM uploads WHERE contract_id = ?', req.params.id)
    await db.run('DELETE FROM notifications WHERE contract_id = ?', req.params.id)
    await db.run('DELETE FROM reminders WHERE contract_id = ?', req.params.id)
    await db.run('DELETE FROM invoices WHERE contract_id = ?', req.params.id)
    await db.run('DELETE FROM contracts WHERE id = ?', req.params.id)
    res.json({ success: true, contract_id: parseInt(req.params.id) })
  } catch (e) {
    console.error('[server] contract delete error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Delete client account (contract + contact info + login, frees unique email/phone) ──
app.delete('/api/admin/clients/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const clientId = req.params.id
    const client = await db.get('SELECT id FROM clients WHERE id = ?', clientId)
    if (!client) return res.status(404).json({ error: 'Client not found' })

    const contracts = await db.all('SELECT id FROM contracts WHERE client_id = ?', clientId)
    const cids = contracts.map(c => c.id)

    await withTransaction(db, async () => {
      // 自底向上删除，避免外键约束冲突
      await db.run('DELETE FROM invoices WHERE client_id = ?', clientId)
      await db.run('DELETE FROM payments WHERE client_id = ?', clientId)
      if (cids.length > 0) {
        const ph = cids.map(() => '?').join(',')
        await db.run(`DELETE FROM packaging_data WHERE contract_id IN (${ph})`, ...cids)
        await db.run(`DELETE FROM reminders WHERE contract_id IN (${ph})`, ...cids)
      }
      await db.run('DELETE FROM uploads WHERE client_id = ?', clientId)
      await db.run('DELETE FROM notifications WHERE client_id = ?', clientId)
      await db.run('DELETE FROM applications WHERE client_id = ?', clientId)
      await db.run('DELETE FROM contracts WHERE client_id = ?', clientId)
      await db.run('DELETE FROM users WHERE client_id = ?', clientId)
      await db.run('DELETE FROM clients WHERE id = ?', clientId)
    })
    res.json({ success: true, client_id: parseInt(clientId) })
  } catch (e) {
    console.error('[server] client delete error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Toggle spam flag on application ──
app.post('/api/admin/applications/:id/spam', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const app = await db.get('SELECT id, is_spam FROM applications WHERE id = ?', req.params.id)
    if (!app) return res.status(404).json({ error: 'Application not found' })
    const newVal = app.is_spam ? 0 : 1
    await db.run('UPDATE applications SET is_spam = ? WHERE id = ?', newVal, req.params.id)
    res.json({ success: true, application_id: parseInt(req.params.id), is_spam: !!newVal })
  } catch (e) {
    console.error('[server] application spam toggle error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Delete application ──
app.delete('/api/admin/applications/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const app = await db.get('SELECT id FROM applications WHERE id = ?', req.params.id)
    if (!app) return res.status(404).json({ error: 'Application not found' })
    await db.run('DELETE FROM applications WHERE id = ?', req.params.id)
    res.json({ success: true, application_id: parseInt(req.params.id) })
  } catch (e) {
    console.error('[server] application delete error:', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Admin: Inbound documents（统一收发邮件·收件队列）──
// EKO-PUNKT 等合作方把客户材料发到 info@freddy-epr.com，IMAP 归档后进入「待人工」队列，
// 管理员在此分配客户、转发给客户或跳过。
app.get('/api/admin/inbound-documents', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const status = req.query.status
    const rows = status
      ? await db.all(
          `SELECT d.*, cl.company_name, cl.contact_name, cl.contact_email
           FROM inbound_documents d LEFT JOIN clients cl ON d.client_id = cl.id
           WHERE d.status = ? ORDER BY d.id DESC LIMIT 200`, status
        )
      : await db.all(
          `SELECT d.*, cl.company_name, cl.contact_name, cl.contact_email
           FROM inbound_documents d LEFT JOIN clients cl ON d.client_id = cl.id
           ORDER BY CASE WHEN d.status = 'pending' THEN 0 ELSE 1 END, d.id DESC LIMIT 200`
        )
    res.json(rows.map(r => ({ ...r, attachments: JSON.parse(r.attachments_json || '[]') })))
  } catch (e) {
    console.error('[server] inbound list error:', e)
    res.status(500).json({ error: e.message })
  }
})

// 手动触发一次 IMAP 轮询（测试/排障用）
app.post('/api/admin/inbound-documents/poll', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const result = await pollInbox()
    res.json({ success: true, ...result })
  } catch (e) {
    console.error('[server] inbound poll error:', e)
    res.status(500).json({ error: e.message })
  }
})

// 手动上传收件材料（免费版邮箱无 IMAP，管理员从网页邮箱下载后在此上传进队列）
// multer dest 不会自动建目录，先确保目录存在
const inboundUpload = multer({ dest: pathJoin(rootPath, 'uploads', 'inbound'), limits: { fileSize: 100 * 1024 * 1024 } })
mkdirSync(pathJoin(rootPath, 'uploads', 'inbound'), { recursive: true })
app.post('/api/admin/inbound-documents/upload', authMiddleware, adminMiddleware, inboundUpload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: '请选择要上传的文件' })
    const db = await getDb()
    const { subject, sender_email, sender_name } = req.body

    const attachments = []
    for (const f of req.files) {
      const safe = `manual-${Date.now()}-${f.originalname.replace(/[^a-zA-Z0-9._\-一-龥]/g, '_')}`
      const newPath = pathJoin(rootPath, 'uploads', 'inbound', safe)
      await rename(f.path, newPath)
      attachments.push({ filename: f.originalname, stored_path: `inbound/${safe}`, size: f.size, mime: f.mimetype })
    }

    const messageId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await db.run(
      `INSERT INTO inbound_documents (message_id, sender_email, sender_name, subject, body_text, received_at, status, attachments_json)
       VALUES (?,?,?,?,?, datetime('now'), 'pending', ?)`,
      messageId, sender_email || '', sender_name || '', subject || '(手动上传)', '', JSON.stringify(attachments)
    )
    res.status(201).json({ success: true, files: attachments.length })
  } catch (e) {
    console.error('[server] inbound upload error:', e)
    res.status(500).json({ error: e.message })
  }
})

// 分配客户（不转发，仅打标；也用于纠正自动匹配）
app.post('/api/admin/inbound-documents/:id/assign', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { client_id } = req.body
    if (!client_id) return res.status(400).json({ error: 'client_id required' })
    const doc = await db.get('SELECT id FROM inbound_documents WHERE id = ?', req.params.id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    await db.run('UPDATE inbound_documents SET client_id = ? WHERE id = ?', client_id, req.params.id)
    res.json({ success: true, id: parseInt(req.params.id), client_id: parseInt(client_id) })
  } catch (e) {
    console.error('[server] inbound assign error:', e)
    res.status(500).json({ error: e.message })
  }
})

// 转发给客户（携带附件），并标记 forwarded
app.post('/api/admin/inbound-documents/:id/forward', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { client_id } = req.body
    const doc = await db.get('SELECT * FROM inbound_documents WHERE id = ?', req.params.id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const cid = client_id || doc.client_id
    if (!cid) return res.status(400).json({ error: '请先分配客户 (client_id)' })
    const cl = await db.get('SELECT contact_email, contact_name, company_name FROM clients WHERE id = ?', cid)
    if (!cl) return res.status(404).json({ error: 'Client not found' })
    if (!cl.contact_email) return res.status(400).json({ error: '客户邮箱缺失' })

    // 从磁盘读回附件（附件文件存于 uploads/inbound/ 下）
    const files = []
    for (const a of JSON.parse(doc.attachments_json || '[]')) {
      const p = pathJoin(rootPath, 'uploads', a.stored_path)
      if (existsSync(p)) files.push({ filename: a.filename, content: readFileSync(p) })
    }

    await sendInboundForward({
      email: cl.contact_email,
      name: cl.contact_name || cl.company_name,
      subject: doc.subject,
      attachments: files,
    })

    await db.run(
      "UPDATE inbound_documents SET client_id = ?, status = 'forwarded', forwarded_at = datetime('now') WHERE id = ?",
      cid, doc.id
    )
    console.log(`[server] inbound #${doc.id} 已转发给 ${cl.contact_email}（客户 ${cl.company_name || cl.contact_name}）`)
    res.json({ success: true, id: doc.id, forwarded_to: cl.contact_email })
  } catch (e) {
    console.error('[server] inbound forward error:', e)
    res.status(500).json({ error: e.message })
  }
})

// 跳过（垃圾/无关邮件，或无需转发）
app.post('/api/admin/inbound-documents/:id/skip', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const doc = await db.get('SELECT id FROM inbound_documents WHERE id = ?', req.params.id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    await db.run("UPDATE inbound_documents SET status = 'skipped' WHERE id = ?", req.params.id)
    res.json({ success: true, id: parseInt(req.params.id) })
  } catch (e) {
    console.error('[server] inbound skip error:', e)
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
  startRateFetcher()
  startReminderScheduler()
  startInboundScheduler()
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
