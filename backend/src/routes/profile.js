import { Router } from 'express'
import bcryptjs from 'bcryptjs'
import { getDb } from '../db.js'
import { authMiddleware } from '../auth.js'

const router = Router()

// GET /api/profile — Get current user's client profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const client = await db.get('SELECT * FROM clients WHERE id = ?', req.user.client_id)
    if (!client) return res.status(404).json({ error: 'Client not found' })
    res.json({ success: true, data: client })
  } catch (e) {
    console.error('[profile] get error:', e)
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/profile — Update client profile
router.put('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { company_name, company_name_en, contact_name, contact_phone, wechat_id,
            uscc, registered_address, legal_representative, lucid_registration_number } = req.body

    await db.run(
      `UPDATE clients SET
        company_name = ?, company_name_en = ?, contact_name = ?,
        contact_phone = ?, wechat_id = ?, uscc = ?,
        registered_address = ?, legal_representative = ?,
        lucid_registration_number = ?, updated_at = datetime('now')
       WHERE id = ?`,
      company_name, company_name_en || '', contact_name,
      contact_phone || '', wechat_id || '', uscc || '',
      registered_address || '', legal_representative || '',
      lucid_registration_number || '',
      req.user.client_id
    )
    res.json({ success: true })
  } catch (e) {
    console.error('[profile] update error:', e)
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/profile/password — Change password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password required' })
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const user = await db.get('SELECT password_hash FROM users WHERE id = ?', req.user.id)
    const valid = await bcryptjs.compare(current_password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

    const hash = await bcryptjs.hash(new_password, 10)
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', hash, req.user.id)
    res.json({ success: true, message: 'Password updated' })
  } catch (e) {
    console.error('[profile] password error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
