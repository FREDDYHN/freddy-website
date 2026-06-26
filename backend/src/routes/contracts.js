import { Router } from 'express'
import { getDb } from '../db.js'
import { authMiddleware } from '../auth.js'
import { createPayment } from '../payment.js'
import { AR_TIER_FEES_EUR } from '../../../shared/constants.js'

const router = Router()

// Generate next contract number — relies on auto-increment + count for readability
async function nextContractNumber(db) {
  const row = await db.get("SELECT COUNT(*) as cnt FROM contracts")
  const n = (row.cnt + 1).toString().padStart(4, '0')
  return 'LTO-AR-' + new Date().getFullYear() + '-' + n
}

/**
 * Normalize a date to ISO date-only string (YYYY-MM-DD).
 * Avoids the fragile new Date(year, month+1, 1) pattern which breaks in December.
 */
function dateStr(date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Calculate contract period:
 *   - Start: first day of NEXT month (gives client time to prepare)
 *   - End:   last day of same month NEXT year
 *
 * Example: signed on 2026-06-27 → start 2026-07-01, end 2027-06-30
 */
function contractPeriod() {
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonth = now.getMonth() + 1  // next calendar month (0-indexed)
  // Use explicit year/month math to handle December → January rollover
  const start = new Date(startYear, startMonth, 1)
  const endYear = startMonth === 12 ? startYear + 2 : startYear + 1
  const endMonth = startMonth === 12 ? 1 : startMonth  // same month number next year
  const end = new Date(endYear, endMonth, 0) // day 0 = last day of previous month
  return {
    startDate: dateStr(start),
    endDate: dateStr(end),
  }
}

// POST /api/contracts — Create new contract (public: called during signup flow)
router.post('/', async (req, res) => {
  const db = await getDb()
  await db.run('BEGIN IMMEDIATE')
  try {
    const { company_name, contact_name, contact_email, contact_phone, wechat_id,
            packaging_items, tier } = req.body

    if (!company_name || !contact_name || !contact_email) {
      await db.run('ROLLBACK')
      return res.status(400).json({ error: 'Missing required fields: company_name, contact_name, contact_email' })
    }

    const annualFee = AR_TIER_FEES_EUR[tier] || AR_TIER_FEES_EUR.basic

    // 1. Create client
    const clientResult = await db.run(
      'INSERT INTO clients (company_name, contact_name, contact_email, contact_phone, wechat_id) VALUES (?, ?, ?, ?, ?)',
      company_name, contact_name, contact_email, contact_phone || '', wechat_id || ''
    )
    const clientId = clientResult.lastID

    // 2. Create contract
    const contractNumber = await nextContractNumber(db)
    const { startDate, endDate } = contractPeriod()

    const contractResult = await db.run(
      'INSERT INTO contracts (client_id, contract_number, tier, annual_fee_eur, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      clientId, contractNumber, tier, annualFee, startDate, endDate, 'pending_payment'
    )
    const contractId = contractResult.lastID

    // 3. Store packaging data
    if (packaging_items && packaging_items.length > 0) {
      for (const item of packaging_items) {
        await db.run(
          'INSERT INTO packaging_data (contract_id, declaration_year, material_type, packaging_category, estimated_quantity_kg) VALUES (?, ?, ?, ?, ?)',
          contractId, new Date().getFullYear(), item.material_type, item.category || 'B2C', item.estimated_kg || 0
        )
      }
    }

    // 4. Create payment
    const payment = await createPayment({ clientId, contractId, tier, method: 'wechat' })

    await db.run('COMMIT')

    res.status(201).json({
      client_id: clientId,
      contract_id: contractId,
      contract_number: contractNumber,
      annual_fee_eur: annualFee,
      start_date: startDate,
      end_date: endDate,
      payment,
    })
  } catch (e) {
    await db.run('ROLLBACK')
    console.error('[contracts] create error:', e)
    res.status(500).json({ error: 'Failed to create contract' })
  }
})

// GET /api/contracts/:id — Get contract details (auth required)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })

    // Clients can only view their own contracts
    if (req.user.role === 'client' && contract.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const client = await db.get('SELECT * FROM clients WHERE id = ?', contract.client_id)
    const packaging = await db.all('SELECT * FROM packaging_data WHERE contract_id = ?', req.params.id)
    res.json({ contract, client, packaging })
  } catch (e) {
    console.error('[contracts] get error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/contracts/:id/sign — Record e-signature (public: called during signup flow)
router.post('/:id/sign', async (req, res) => {
  try {
    const db = await getDb()
    const { signer_name } = req.body
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown'
    await db.run(
      "UPDATE contracts SET status = 'signed', signed_at = datetime('now'), signed_ip = ? WHERE id = ?",
      ip, req.params.id
    )
    res.json({ success: true, contract_id: parseInt(req.params.id), signed_at: new Date().toISOString(), signer_name })
  } catch (e) {
    console.error('[contracts] sign error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/contracts/:id/confirm-lucid — Mark LUCID confirmed (auth required)
router.post('/:id/confirm-lucid', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    await db.run('UPDATE contracts SET lucid_confirmed = 1 WHERE id = ?', req.params.id)
    res.json({ success: true })
  } catch (e) {
    console.error('[contracts] confirm-lucid error:', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/contracts/lookup/:number — Public lookup by contract number
router.get('/lookup/:number', async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get(
      'SELECT c.*, cl.company_name, cl.contact_email FROM contracts c JOIN clients cl ON c.client_id = cl.id WHERE c.contract_number = ?',
      req.params.number
    )
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    res.json(contract)
  } catch (e) {
    console.error('[contracts] lookup error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
