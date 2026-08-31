import { Router } from 'express'
import bcrypt from 'bcrypt'
import { getDb } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'
import { encryptLucid } from '../services/crypto.js'
import { CLIENT_CHANGEABLE_FIELDS, containsChinese } from '../../../shared/constants.js'

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
    // 英文/拼音字段禁止中文
    if (containsChinese(company_name_en)) return res.status(400).json({ error: '英文/拼音字段不能包含中文' })

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

// POST /api/profile/change-request — 提交信息修改申请（客户 → 管理员审核）
router.post('/change-request', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { changes } = req.body

    // 校验：changes 必须是「字段名 → 新值」的对象
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      return res.status(400).json({ error: '请提供要修改的字段' })
    }

    // 白名单过滤，忽略非法字段；跳过空值（客户未填的字段）
    const valid = {}
    for (const [field, value] of Object.entries(changes)) {
      if (!(field in CLIENT_CHANGEABLE_FIELDS)) continue
      const v = String(value ?? '').trim()
      if (v) valid[field] = v
    }
    if (Object.keys(valid).length === 0) {
      return res.status(400).json({ error: '请至少填写一个要修改的字段' })
    }
    // 英文/拼音字段禁止中文
    const noChineseFields = ['company_name_en', 'legal_representative_en', 'registered_address_en']
    if (noChineseFields.some(f => valid[f] && containsChinese(valid[f]))) {
      return res.status(400).json({ error: '英文/拼音字段不能包含中文' })
    }

    const result = await db.run(
      "INSERT INTO applications (client_id, type, data_json, status) VALUES (?, 'info_change', ?, 'pending')",
      req.user.client_id, JSON.stringify({ changes: valid })
    )

    res.status(201).json({ success: true, application_id: result.lastID })
  } catch (e) {
    console.error('[profile] change-request error:', e)
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/profile/lucid — Save LUCID login credentials (encrypted) + LUCID 注册号
router.put('/lucid', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { lucid_login, lucid_password, lucid_registration_number } = req.body
    if (!lucid_login || !lucid_login.trim()) return res.status(400).json({ error: 'LUCID 登录名必填' })
    if (!lucid_password) return res.status(400).json({ error: 'LUCID 密码必填' })

    const enc = encryptLucid(lucid_password)
    const regNo = (lucid_registration_number || '').trim()
    // 提供了 LUCID 注册号才更新（避免仅更新登录密码时误清空已有注册号）
    if (regNo) {
      await db.run(
        "UPDATE clients SET lucid_login = ?, lucid_password_enc = ?, lucid_registration_number = ?, updated_at = datetime('now') WHERE id = ?",
        lucid_login.trim(), enc, regNo, req.user.client_id
      )
    } else {
      await db.run(
        "UPDATE clients SET lucid_login = ?, lucid_password_enc = ?, updated_at = datetime('now') WHERE id = ?",
        lucid_login.trim(), enc, req.user.client_id
      )
    }
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
