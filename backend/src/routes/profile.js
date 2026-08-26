import { Router } from 'express'
import bcrypt from 'bcrypt'
import { getDb } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'
import { encryptLucid } from '../services/crypto.js'

const router = Router()

// GET /api/profile — Get current user's client profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const client = await db.get('SELECT * FROM clients WHERE id = ?', req.user.client_id)
    if (!client) return res.status(404).json({ error: 'Client not found' })
    delete client.lucid_password_enc
    res.json({ success: true, data: client })
  } catch (e) {
    console.error('[profile] get error:', e)
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/profile — Update client profile
// NOTE: Field names are directly mapped from req.body to DB columns.
// Frontend Profile.jsx must use the same field names (company_name, uscc, etc.)
router.put('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { company_name, company_name_en, contact_name, contact_phone, wechat_id,
            entity_type, uscc, id_number, registered_address, legal_representative, lucid_registration_number } = req.body

    // 税号校验（公司 → uscc 必填 / 个人 → id_number 必填）
    const entityType = entity_type === 'individual' ? 'individual' : 'company'
    if (entityType === 'individual') {
      if (!id_number || !String(id_number).trim()) return res.status(400).json({ error: '身份证号码必填' })
    } else {
      if (!uscc || !String(uscc).trim()) return res.status(400).json({ error: '统一社会信用代码（税号）必填' })
    }

    await db.run(
      `UPDATE clients SET
        company_name = ?, company_name_en = ?, contact_name = ?,
        contact_phone = ?, wechat_id = ?, entity_type = ?, uscc = ?, id_number = ?,
        registered_address = ?, legal_representative = ?,
        lucid_registration_number = ?, updated_at = datetime('now')
       WHERE id = ?`,
      company_name, company_name_en || '', contact_name,
      contact_phone || '', wechat_id || '', entityType, uscc || '', id_number || '',
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

// PUT /api/profile/lucid — Save LUCID login credentials (encrypted)
router.put('/lucid', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { lucid_login, lucid_password } = req.body
    if (!lucid_login || !lucid_login.trim()) return res.status(400).json({ error: 'LUCID 登录名必填' })
    if (!lucid_password) return res.status(400).json({ error: 'LUCID 密码必填' })

    const enc = encryptLucid(lucid_password)
    await db.run(
      "UPDATE clients SET lucid_login = ?, lucid_password_enc = ?, updated_at = datetime('now') WHERE id = ?",
      lucid_login.trim(), enc, req.user.client_id
    )
    res.json({ success: true })
  } catch (e) {
    console.error('[profile] lucid save error:', e)
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
    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

    const hash = await bcrypt.hash(new_password, 10)
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', hash, req.user.id)
    res.json({ success: true, message: 'Password updated' })
  } catch (e) {
    console.error('[profile] password error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
