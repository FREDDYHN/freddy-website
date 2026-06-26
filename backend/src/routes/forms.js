import { Router } from 'express'
import { getDb } from '../db.js'
import { sendConfirmation } from '../services/email.js'
import { WEEE_STARTING_PRICE, BATTERY_PRICES } from '../../../shared/constants.js'

const router = Router()

// POST /api/forms/weee — Submit WEEE registration
router.post('/weee', async (req, res) => {
  try {
    const db = await getDb()
    const { company_name, contact_name, contact_email, contact_phone, device_count, brand_count, year_type } = req.body

    if (!company_name || !contact_name || !contact_email) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Create client if not exists
    let client = await db.get('SELECT id FROM clients WHERE contact_email = ?', contact_email)
    if (!client) {
      const r = await db.run('INSERT INTO clients (company_name, contact_name, contact_email, contact_phone) VALUES (?,?,?,?)',
        company_name, contact_name, contact_email, contact_phone || '')
      client = { id: r.lastID }
    }

    // Insert application record
    const result = await db.run(
      `INSERT INTO applications (client_id, type, data_json, status) VALUES (?, 'weee', ?, 'pending')`,
      client.id, JSON.stringify({ device_count, brand_count, year_type })
    )

    // Send confirmation email
    try {
      await sendConfirmation({
        email: contact_email, name: contact_name,
        contractNumber: 'WEEE-' + result.lastID,
        tier: 'weee', fee: WEEE_STARTING_PRICE,
      })
    } catch (e) { console.error('[forms] WEEE confirmation email failed:', e.message) }

    res.status(201).json({ application_id: result.lastID, status: 'pending', message: 'WEEE registration submitted. We will contact you within 48 hours.' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/forms/battery — Submit Battery registration
router.post('/battery', async (req, res) => {
  try {
    const db = await getDb()
    const { company_name, contact_name, contact_email, contact_phone, brand_count, year_type } = req.body

    if (!company_name || !contact_name || !contact_email) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    let client = await db.get('SELECT id FROM clients WHERE contact_email = ?', contact_email)
    if (!client) {
      const r = await db.run('INSERT INTO clients (company_name, contact_name, contact_email, contact_phone) VALUES (?,?,?,?)',
        company_name, contact_name, contact_email, contact_phone || '')
      client = { id: r.lastID }
    }

    const result = await db.run(
      `INSERT INTO applications (client_id, type, data_json, status) VALUES (?, 'battery', ?, 'pending')`,
      client.id, JSON.stringify({ brand_count, year_type })
    )

    try {
      await sendConfirmation({
        email: contact_email, name: contact_name,
        contractNumber: 'BATT-' + result.lastID,
        tier: 'battery', fee: BATTERY_PRICES.baseFee,
      })
    } catch (e) { console.error('[forms] Battery confirmation email failed:', e.message) }

    res.status(201).json({ application_id: result.lastID, status: 'pending', message: 'Battery registration submitted.' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
