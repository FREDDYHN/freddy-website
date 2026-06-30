/**
 * FREDDY Admin Communication API — Upload review + client messaging
 *
 * Endpoints for admins to review uploads (approve/reject) and
 * send text messages to clients. Each action creates a notification
 * record that the client sees in their dashboard bell.
 */
import { Router } from 'express'
import { getDb } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'
import { calcMaterialFee, applyFloorFee } from '../../../shared/constants.js'

const router = Router()

const FILE_LABELS = {
  signed_contract: '已签署合同',
  bank_proof: '银行转账凭证',
  proof_annual_fee: '年费付款凭证',
  proof_prepaid: '预缴回收费凭证',
  proof_settlement: '年终结算凭证',
  admin_stamped: '管理文件',
  payment_proof: '付款凭证',
}

// GET /api/admin/uploads/pending — list uploads awaiting review
router.get('/uploads/pending', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const rows = await db.all(
      `SELECT u.*, cl.company_name, cl.contact_email, c.contract_number
       FROM uploads u
       JOIN clients cl ON u.client_id = cl.id
       LEFT JOIN contracts c ON u.contract_id = c.id
       WHERE u.status = 'pending'
       ORDER BY u.uploaded_at DESC`
    )
    res.json({ success: true, data: rows })
  } catch (e) {
    console.error('[admin] pending uploads error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/admin/uploads/:id/review — approve or reject an upload
router.post('/uploads/:id/review', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { status, comment } = req.body
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "approved" or "rejected"' })
    }

    const upload = await db.get('SELECT * FROM uploads WHERE id = ?', req.params.id)
    if (!upload) return res.status(404).json({ error: 'Upload not found' })
    if (upload.status === 'approved') return res.status(400).json({ error: 'Upload already approved' })

    await db.run('BEGIN IMMEDIATE')
    try {
      await db.run(
        'UPDATE uploads SET status = ?, review_comment = ? WHERE id = ?',
        status, comment || null, req.params.id
      )

      // Create notification for the client
      const fileLabel = FILE_LABELS[upload.file_type] || upload.original_name

      if (status === 'approved') {
        // Map upload type → payment type to auto-confirm
        const PAYMENT_MAP = {
          bank_proof: 'contract_fee',
          proof_annual_fee: 'contract_fee',
          proof_prepaid: 'recycling_prepaid',
          proof_settlement: 'recycling_settlement',
        }
        const paymentType = PAYMENT_MAP[upload.file_type]
        if (paymentType && upload.contract_id) {
          // Find the corresponding pending payment
          const pmt = paymentType === 'contract_fee'
            ? await db.get(
                "SELECT * FROM payments WHERE contract_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
                upload.contract_id
              )
            : await db.get(
                "SELECT * FROM payments WHERE contract_id = ? AND payment_type = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
                upload.contract_id, paymentType
              )
          if (pmt) {
            await db.run("UPDATE payments SET status = 'paid', paid_at = datetime('now') WHERE id = ?", pmt.id)
            if (paymentType === 'contract_fee') {
              await db.run("UPDATE contracts SET status = 'active', paid_confirmed_at = datetime('now'), activated_at = datetime('now') WHERE id = ? AND status = 'pending_payment'", upload.contract_id)
              const inv = 'INV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
              await db.run("INSERT INTO invoices (client_id, contract_id, payment_id, invoice_number, amount_eur, status) VALUES (?,?,?,?,?,'issued')", upload.client_id, upload.contract_id, pmt.id, inv, pmt.amount_eur)
            }
          } else if (paymentType === 'recycling_prepaid') {
            // Prepaid: auto-create as paid (admin can adjust amount via set-fee)
            await db.run(
              "INSERT INTO payments (client_id, contract_id, payment_type, amount_cny, amount_eur, payment_method, out_trade_no, status, paid_at) VALUES (?,?,?,0,0,'bank','REVIEW-'||?,?,datetime('now'))",
              upload.client_id, upload.contract_id, paymentType, Date.now().toString(36).toUpperCase(), 'paid'
            )
          } else if (paymentType === 'recycling_settlement') {
            // Calculate settlement from actual vs estimated kg
            const pkg = await db.all('SELECT material_type, estimated_quantity_kg, actual_quantity_kg FROM packaging_data WHERE contract_id = ?', upload.contract_id)
            if (pkg.length > 0 && pkg.some(p => p.actual_quantity_kg > 0)) {
              const byMatEst = {}, byMatAct = {}
              let estFee = 0, actFee = 0
              pkg.forEach(p => {
                const mk = p.material_type; const ek = parseFloat(p.estimated_quantity_kg) || 0; const ak = parseFloat(p.actual_quantity_kg) || 0
                byMatEst[mk] = (byMatEst[mk] || 0) + ek; if (ak > 0) byMatAct[mk] = (byMatAct[mk] || 0) + ak
              })
              Object.entries(byMatEst).forEach(([mk, kg]) => { estFee += calcMaterialFee(mk, kg) })
              Object.entries(byMatAct).forEach(([mk, kg]) => { actFee += calcMaterialFee(mk, kg) })
              estFee = applyFloorFee(estFee, 28.90)
              actFee = applyFloorFee(actFee, 28.90)
              const diff = actFee - estFee
              let settle = diff
              if (diff > estFee * 0.2 && estFee > 0) settle = diff * 1.2
              else if (diff < 0) { const limit = estFee * 0.1; settle = -Math.min(Math.abs(diff), limit) }
              settle = Math.round(settle * 100) / 100
              await db.run(
                "INSERT INTO payments (client_id, contract_id, payment_type, amount_cny, amount_eur, payment_method, out_trade_no, status, paid_at) VALUES (?,?,?,?,?,?,'REVIEW-'||?,?,datetime('now'))",
                upload.client_id, upload.contract_id, paymentType, 0, settle, 'bank', Date.now().toString(36).toUpperCase(), 'paid'
              )
            }
          }
        }

        await db.run(
          `INSERT INTO notifications (client_id, contract_id, type, title, message)
           VALUES (?, ?, 'upload_approved', '✅ 文件审核通过', ?)`,
          upload.client_id, upload.contract_id,
          `您上传的「${fileLabel}」已审核通过。${paymentType && paymentType === 'contract_fee' ? '合同已激活。' : ''}`
        )
      } else {
        await db.run(
          `INSERT INTO notifications (client_id, contract_id, type, title, message)
           VALUES (?, ?, 'upload_rejected', '❌ 文件需重新提交', ?)`,
          upload.client_id, upload.contract_id,
          `您上传的「${fileLabel}」未通过审核。${comment ? '原因：' + comment : '请登录后重新上传。'}`
        )
      }

      await db.run('COMMIT')
      console.log(`[admin] Upload ${req.params.id} ${status} by admin — notified client ${upload.client_id}`)
      res.json({ success: true, upload_id: parseInt(req.params.id), status })
    } catch (e) {
      await db.run('ROLLBACK')
      throw e
    }
  } catch (e) {
    console.error('[admin] review error:', e)
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/admin/uploads/:id — delete an upload
router.delete('/uploads/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const upload = await db.get('SELECT * FROM uploads WHERE id = ?', req.params.id)
    if (!upload) return res.status(404).json({ error: 'Upload not found' })
    await db.run('DELETE FROM uploads WHERE id = ?', req.params.id)
    console.log(`[admin] Deleted upload ${req.params.id}`)
    res.json({ success: true })
  } catch (e) {
    console.error('[admin] delete upload error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/admin/messages — send a text message to a client
router.post('/messages', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { client_id, contract_id, title, message } = req.body
    if (!client_id || !message) {
      return res.status(400).json({ error: 'client_id and message required' })
    }

    // Verify client exists
    const client = await db.get('SELECT id FROM clients WHERE id = ?', client_id)
    if (!client) return res.status(404).json({ error: 'Client not found' })

    await db.run(
      `INSERT INTO notifications (client_id, contract_id, type, title, message)
       VALUES (?, ?, 'admin_message', ?, ?)`,
      client_id, contract_id || null,
      title || '💬 管理员消息', message
    )

    console.log(`[admin] Message sent to client ${client_id}`)
    res.status(201).json({ success: true })
  } catch (e) {
    console.error('[admin] message error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
