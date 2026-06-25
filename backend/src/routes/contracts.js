import { Router } from 'express'
import { getDb } from '../db.js'
import { authMiddleware } from '../auth.js'
import { createPayment } from '../payment.js'

const router = Router()

// Generate next contract number
async function nextContractNumber(db) {
  const row = await db.get("SELECT COUNT(*) as cnt FROM contracts")
  const n = (row.cnt + 1).toString().padStart(4, '0')
  return 'LTO-AR-' + new Date().getFullYear() + '-' + n
}

// POST /api/contracts — Create new contract from signup form data
router.post('/', async (req, res) => {
  try {
    const db = await getDb()
    const { company_name, contact_name, contact_email, contact_phone, wechat_id,
            packaging_items, tier } = req.body

    if (!company_name || !contact_name || !contact_email) {
      return res.status(400).json({ error: 'Missing required fields: company_name, contact_name, contact_email' })
    }

    const tierFee = { basic: 89, standard: 159, premium: 249 }
    const annualFee = tierFee[tier] || 89

    // Create client
    const clientResult = await db.run(
      'INSERT INTO clients (company_name, contact_name, contact_email, contact_phone, wechat_id) VALUES (?, ?, ?, ?, ?)',
      company_name, contact_name, contact_email, contact_phone || '', wechat_id || ''
    )
    const clientId = clientResult.lastID

    // Create contract
    const contractNumber = await nextContractNumber(db)
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10)
    const endDate = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0).toISOString().slice(0, 10)

    await db.run(
      'INSERT INTO contracts (client_id, contract_number, tier, annual_fee_eur, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      clientId, contractNumber, tier, annualFee, startDate, endDate, 'pending_payment'
    )

    // Get actual contract ID
    const contractId = (await db.get('SELECT last_insert_rowid() as id')).id

    // Store packaging data
    if (packaging_items && packaging_items.length > 0) {
      for (const item of packaging_items) {
        await db.run(
          'INSERT INTO packaging_data (contract_id, declaration_year, material_type, packaging_category, estimated_quantity_kg) VALUES (?, ?, ?, ?, ?)',
          contractId, new Date().getFullYear(), item.material_type, item.category || 'B2C', item.estimated_kg || 0
        )
      }
    }

    // Create payment
    const payment = await createPayment({ clientId, contractId, tier, method: 'wechat' })

    res.status(201).json({
      client_id: clientId,
      contract_number: contractNumber,
      annual_fee_eur: annualFee,
      start_date: startDate,
      end_date: endDate,
      payment,
    })
  } catch (e) {
    console.error('[contracts] create error:', e)
    res.status(500).json({ error: 'Failed to create contract' })
  }
})

// GET /api/contracts/:id — Get contract details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Not found' })
    const client = await db.get('SELECT * FROM clients WHERE id = ?', contract.client_id)
    const packaging = await db.all('SELECT * FROM packaging_data WHERE contract_id = ?', req.params.id)
    res.json({ contract, client, packaging })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/contracts/:id/sign — Record e-signature (public: called during signup flow)
router.post('/:id/sign', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { signer_name } = req.body
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'
    await db.run(
      "UPDATE contracts SET status = 'signed', signed_at = datetime('now'), signed_ip = ? WHERE id = ?",
      ip, req.params.id
    )
    res.json({ success: true, contract_id: parseInt(req.params.id), signed_at: new Date().toISOString(), signer_name })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/contracts/:id/confirm-lucid — Mark LUCID confirmed
router.post('/:id/confirm-lucid', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    await db.run('UPDATE contracts SET lucid_confirmed = 1 WHERE id = ?', req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/contracts/lookup/:number — Public lookup by contract number
router.get('/lookup/:number', async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT c.*, cl.company_name, cl.contact_email FROM contracts c JOIN clients cl ON c.client_id = cl.id WHERE c.contract_number = ?', req.params.number)
    if (!contract) return res.status(404).json({ error: 'Not found' })
    res.json(contract)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
