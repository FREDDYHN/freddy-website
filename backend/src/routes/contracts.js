import { Router } from 'express'
import bcryptjs from 'bcryptjs'
import { getDb } from '../db.js'
import { authMiddleware } from '../auth.js'
import { createPayment } from '../payment.js'
import { generateContract, getContractUrl } from '../services/contract-gen.js'
import { AR_TIER_FEES_EUR, WEEE_PRICES, BATTERY_PRICES } from '../../../shared/constants.js'

const router = Router()

// Generate next contract number with service-type prefix
async function nextContractNumber(db, type) {
  const row = await db.get('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM contracts')
  const n = String(row.next_id).padStart(4, '0')
  const prefix = type === 'weee' ? 'LTO-WEEE-' : type === 'battery' ? 'LTO-BATT-' : 'LTO-AR-'
  return prefix + new Date().getFullYear() + '-' + n
}

// Calculate WEEE fee
function calcWeeeFee(deviceCategories, brandCount, yearType) {
  const cats = deviceCategories?.length || 1
  let fee = (WEEE_PRICES.baseFee || 129)
  if (cats > 1) fee += (cats - 1) * (WEEE_PRICES.extraCategory || 99)
  if (brandCount > 1) fee += (brandCount - 1) * (WEEE_PRICES.extraBrand || 79.95)
  if (yearType === 'first') fee += (WEEE_PRICES.authFirstYear || 50.76)
  return fee
}

// Calculate Battery fee
function calcBatteryFee(brandCount, yearType) {
  let fee = (BATTERY_PRICES.baseFee || 129)
  if (brandCount > 1) fee += (brandCount - 1) * (BATTERY_PRICES.extraBrand || 49)
  if (yearType === 'first') fee += (BATTERY_PRICES.authFirstYear || 50.76)
  return fee
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
 *   - End:   last day of the 12th month after start
 *
 * Uses the actual resolved start date for end calculation,
 * correctly handling JavaScript Date month overflow (e.g. month 12 → January next year).
 *
 * Examples:
 *   signed on 2026-06-27 → start 2026-07-01, end 2027-06-30
 *   signed on 2026-12-15 → start 2027-01-01, end 2027-12-31
 */
function contractPeriod() {
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonth = now.getMonth() + 1  // next calendar month (0-indexed)
  const start = new Date(startYear, startMonth, 1)
  // Calculate end based on the ACTUAL resolved start date
  // (handles December→January overflow correctly via JS Date auto-roll)
  const end = new Date(start.getFullYear() + 1, start.getMonth(), 0)
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
    const { service_type, company_name, company_name_en, registered_address, registered_address_en, uscc, legal_representative, legal_representative_en,
            contact_person, contact_person_en, contact_email, contact_phone, wechat_id,
            packaging_items, tier, password, device_categories, brand_count, year_type } = req.body

    if (!company_name || !contact_person || !contact_email || !registered_address || !contact_phone || !wechat_id) {
      await db.run('ROLLBACK')
      return res.status(400).json({ error: 'Missing required fields: company_name, registered_address, contact_person, contact_email, contact_phone, wechat_id' })
    }

    const svcType = service_type || 'packaging'
    const isPackaging = svcType === 'packaging'

    // Calculate fee based on service type
    let annualFee
    let contractTier
    if (isPackaging) {
      annualFee = AR_TIER_FEES_EUR[tier] || AR_TIER_FEES_EUR.basic
      contractTier = tier || 'basic'
    } else if (svcType === 'weee') {
      annualFee = calcWeeeFee(device_categories, parseInt(brand_count) || 1, year_type)
      contractTier = 'weee'
    } else if (svcType === 'battery') {
      annualFee = calcBatteryFee(parseInt(brand_count) || 1, year_type)
      contractTier = 'battery'
    } else {
      annualFee = AR_TIER_FEES_EUR.basic
      contractTier = 'standard'
    }

    // 1. Create or reuse client (by email)
    let clientId
    const existingClient = await db.get('SELECT id FROM clients WHERE contact_email = ?', contact_email)
    if (existingClient) {
      clientId = existingClient.id
      // Update existing client with latest info
      await db.run(
        'UPDATE clients SET company_name=?, company_name_en=?, registered_address=?, uscc=?, legal_representative=?, contact_name=?, contact_phone=?, wechat_id=? WHERE id=?',
        company_name, company_name_en || '', registered_address || '', uscc || '', legal_representative || '', contact_person || '', contact_phone || '', wechat_id || '', clientId
      )
    } else {
      const clientResult = await db.run(
        'INSERT INTO clients (company_name, company_name_en, registered_address, uscc, legal_representative, contact_name, contact_email, contact_phone, wechat_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        company_name, company_name_en || '', registered_address || '', uscc || '', legal_representative || '', contact_person || '', contact_email, contact_phone || '', wechat_id || ''
      )
      clientId = clientResult.lastID
    }

    // 2. Create contract
    const contractNumber = await nextContractNumber(db, svcType)
    const { startDate, endDate } = contractPeriod()

    const contractResult = await db.run(
      'INSERT INTO contracts (client_id, contract_number, tier, annual_fee_eur, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      clientId, contractNumber, contractTier, annualFee, startDate, endDate, 'pending_payment'
    )
    const contractId = contractResult.lastID

    // 3. Store service-specific data
    if (isPackaging && packaging_items && packaging_items.length > 0) {
      for (const item of packaging_items) {
        await db.run(
          'INSERT INTO packaging_data (contract_id, declaration_year, material_type, packaging_category, estimated_quantity_kg) VALUES (?, ?, ?, ?, ?)',
          contractId, new Date().getFullYear(), item.material_type, item.category || 'B2C', item.estimated_kg || 0
        )
      }
    }
    // For WEEE/Battery, store as application record for reference
    if (!isPackaging) {
      await db.run(
        "INSERT INTO applications (client_id, type, data_json, status) VALUES (?, ?, ?, 'pending')",
        clientId, svcType, JSON.stringify({ device_categories, brand_count, year_type, contract_id: contractId })
      )
    }

    // 4. Create payment
    const payment = await createPayment({ clientId, contractId, tier: contractTier, method: 'wechat', amountEur: annualFee })

    // 5. Create user account if password provided (so client can log into Dashboard)
    if (password) {
      const existingUser = await db.get('SELECT id FROM users WHERE email = ?', contact_email)
      if (!existingUser) {
        const hash = await bcryptjs.hash(password, 10)
        await db.run(
          'INSERT INTO users (email, password_hash, role, client_id) VALUES (?, ?, ?, ?)',
          contact_email, hash, 'client', clientId
        )
      }
    }

    await db.run('COMMIT')

    // Generate contract DOCX for preview
    let download_url = null
    try {
      const genType = svcType === 'weee' ? 'weee' : svcType === 'battery' ? 'battery' : 'ar'
      const filePath = await generateContract({
        type: genType,
        clientLocation: 'cn',
        data: {
          company_name, company_name_en: company_name_en || company_name,
          company_address: registered_address || '',
          registered_address_en: registered_address_en || '',
          uscc: uscc || '',
          legal_representative: legal_representative || '',
          legal_representative_en: legal_representative_en || '',
          contact_person: contact_person || '',
          contact_person_en: contact_person_en || '',
          contact_email, contact_phone, wechat_id,
          contract_number: contractNumber, annual_fee_eur: annualFee,
          start_date: startDate, end_date: endDate,
          packaging_items: svcType === 'packaging' ? (packaging_items || []) : '',
        },
      })
      download_url = getContractUrl(filePath)
    } catch (e) { console.error('[contracts] Preview generation failed:', e.message) }

    res.status(201).json({
      client_id: clientId,
      contract_id: contractId,
      contract_number: contractNumber,
      annual_fee_eur: annualFee,
      start_date: startDate,
      end_date: endDate,
      payment,
      download_url,
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

    if (!signer_name || !signer_name.trim()) {
      return res.status(400).json({ error: 'Signer name required' })
    }

    // Verify contract exists and is in a signable state
    const contract = await db.get('SELECT status FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    if (contract.status === 'signed') return res.status(409).json({ error: 'Contract already signed' })
    if (contract.status !== 'pending_payment') {
      return res.status(400).json({ error: `Cannot sign a contract with status: ${contract.status}` })
    }

    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown'
    await db.run(
      "UPDATE contracts SET status = 'signed', signed_at = datetime('now'), signed_ip = ? WHERE id = ? AND status = 'pending_payment'",
      ip, req.params.id
    )
    res.json({ success: true, contract_id: parseInt(req.params.id), signed_at: new Date().toISOString(), signer_name: signer_name.trim() })
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

// POST /api/contracts/:id/cancel-lucid — Revoke LUCID confirmation (auth required)
router.post('/:id/cancel-lucid', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    if (req.user.role !== 'admin' && contract.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    await db.run('UPDATE contracts SET lucid_confirmed = 0 WHERE id = ?', req.params.id)
    res.json({ success: true })
  } catch (e) {
    console.error('[contracts] cancel-lucid error:', e)
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
