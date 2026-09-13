/**
 * FREDDY Admin Communication API — Upload review + client messaging
 *
 * Endpoints for admins to review uploads (approve/reject) and
 * send text messages to clients. Each action creates a notification
 * record that the client sees in their dashboard bell.
 */
import { Router } from 'express'
import { getDb, withTransaction } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'
import { calcMaterialFee, applyFloorFee, CLIENT_CHANGEABLE_FIELDS, containsChinese } from '../../../shared/constants.js'
import { formatInvoiceNumber, generateAndSendInvoice } from '../services/invoice.js'
import { localDate } from '../services/date.js'
import { unlinkUploadFile } from './uploads.js'

const router = Router()

const FILE_LABELS = {
  signed_contract: '已签署合同',
  bank_proof: '银行转账凭证',
  proof_annual_fee: '年费付款凭证',
  proof_prepaid: '预缴回收费凭证',
  proof_predeclared: '预申报缴费凭证',
  proof_settlement: '年终结算凭证',
  proof_previous_year: '往年缴费凭证',
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
    const { status, comment, action } = req.body
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "approved" or "rejected"' })
    }

    const upload = await db.get('SELECT * FROM uploads WHERE id = ?', req.params.id)
    if (!upload) return res.status(404).json({ error: 'Upload not found' })
    if (upload.status === 'approved') return res.status(400).json({ error: 'Upload already approved' })

    // 管理员审核「预申报费」凭证时可主动指定处理类型：collect=代收 / self_declared=自行预申报
    // （覆盖 file_type，纠正客户传错类型的情况）
    let effectiveType = upload.file_type
    if (action === 'collect' && upload.file_type === 'proof_predeclared') effectiveType = 'proof_prepaid'
    else if (action === 'self_declared' && upload.file_type === 'proof_prepaid') effectiveType = 'proof_predeclared'

    let invoiceToSend = null
    await withTransaction(db, async () => {
      await db.run(
        'UPDATE uploads SET status = ?, review_comment = ?, file_type = ? WHERE id = ?',
        status, comment || null, effectiveType, req.params.id
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
        const paymentType = PAYMENT_MAP[effectiveType]
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
              const today = localDate()
              const endOfYear = `${new Date().getFullYear()}-12-31`
              await db.run("UPDATE contracts SET status = 'active', paid_confirmed_at = datetime('now'), activated_at = datetime('now'), start_date = ?, end_date = ? WHERE id = ? AND status = 'pending_payment'", today, endOfYear, upload.contract_id)
              const contract = await db.get('SELECT contract_number FROM contracts WHERE id = ?', upload.contract_id)
              const invNo = contract?.contract_number ? formatInvoiceNumber(contract.contract_number) : ('INV-' + Date.now().toString(36).toUpperCase())
              await db.run("INSERT INTO invoices (client_id, contract_id, payment_id, invoice_number, amount_eur, status) VALUES (?,?,?,?,?,'issued')", upload.client_id, upload.contract_id, pmt.id, invNo, pmt.amount_eur)
              invoiceToSend = { client_id: upload.client_id, contract_id: upload.contract_id, invoice_number: invNo, amount_eur: pmt.amount_eur, invoice_date: today }
            }
          } else if (paymentType === 'recycling_prepaid') {
            // 已有 paid 代缴记录（如客户既传 proof_prepaid 又误传 proof_predeclared，被「确认代收」二次审核）→ 不重复建
            const existingPaid = await db.get(
              "SELECT id FROM payments WHERE contract_id = ? AND payment_type = 'recycling_prepaid' AND status = 'paid' ORDER BY id DESC LIMIT 1",
              upload.contract_id
            )
            if (!existingPaid) {
              // Calculate prepaid fee from packaging data (same as client dashboard)
              const pkg = await db.all('SELECT material_type, estimated_quantity_kg FROM packaging_data WHERE contract_id = ?', upload.contract_id)
              if (pkg.length > 0) {
                const byMat = {}; pkg.forEach(p => { const mk = p.material_type; const kg = parseFloat(p.estimated_quantity_kg) || 0; byMat[mk] = (byMat[mk] || 0) + kg })
                let fee = 0; Object.entries(byMat).forEach(([mk, kg]) => { fee += calcMaterialFee(mk, kg) })
                fee = applyFloorFee(fee, 28.90)
                await db.run(
                  "INSERT INTO payments (client_id, contract_id, payment_type, amount_cny, amount_eur, payment_method, out_trade_no, status, paid_at) VALUES (?,?,?,?,?,'bank','REVIEW-'||?,?,datetime('now'))",
                  upload.client_id, upload.contract_id, paymentType, 0, fee, Date.now().toString(36).toUpperCase(), 'paid'
                )
              }
            }
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

        // 「已预申报」凭证审核通过 → 确认预申报状态（不动 payments）
        if (effectiveType === 'proof_predeclared' && upload.contract_id) {
          await db.run("UPDATE contracts SET pre_declared_status = 'approved' WHERE id = ?", upload.contract_id)
        } else if (effectiveType === 'proof_prepaid' && upload.file_type === 'proof_predeclared' && upload.contract_id) {
          // 管理员判定「代收」而非自行预申报 → 撤销客户的自报「已预申报」状态
          await db.run("UPDATE contracts SET pre_declared_status = NULL WHERE id = ?", upload.contract_id)
        }

        await db.run(
          `INSERT INTO notifications (client_id, contract_id, type, title, message)
           VALUES (?, ?, 'upload_approved', '✅ 文件审核通过', ?)`,
          upload.client_id, upload.contract_id,
          `您上传的「${fileLabel}」已审核通过。${paymentType && paymentType === 'contract_fee' ? '合同已激活。' : ''}`
        )
      } else {
        // 「已预申报」凭证被驳回 → 重置为未请求，客户端可重新标记
        if (effectiveType === 'proof_predeclared' && upload.contract_id) {
          await db.run('UPDATE contracts SET pre_declared_status = NULL WHERE id = ?', upload.contract_id)
        }

        await db.run(
          `INSERT INTO notifications (client_id, contract_id, type, title, message)
           VALUES (?, ?, 'upload_rejected', '❌ 文件需重新提交', ?)`,
          upload.client_id, upload.contract_id,
          `您上传的「${fileLabel}」未通过审核。${comment ? '原因：' + comment : '请登录后重新上传。'}`
        )
      }

    })
    if (invoiceToSend) {
      generateAndSendInvoice(invoiceToSend).catch(e => console.error('[invoice] send failed:', e.message))
    }
    console.log(`[admin] Upload ${req.params.id} ${status} by admin — notified client ${upload.client_id}`)
    res.json({ success: true, upload_id: parseInt(req.params.id), status })
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
    unlinkUploadFile(upload.stored_path)
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

// POST /api/admin/applications/:id/review — 审核信息修改申请（通过/拒绝）
router.post('/applications/:id/review', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const { action, comment } = req.body
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' })
    }

    const app = await db.get('SELECT * FROM applications WHERE id = ?', req.params.id)
    if (!app) return res.status(404).json({ error: 'Application not found' })
    if (app.type !== 'info_change') return res.status(400).json({ error: 'Not an info_change application' })
    if (app.status !== 'pending') return res.status(400).json({ error: 'Application already processed' })

    if (action === 'approve') {
      // 解析待改字段，白名单校验后 UPDATE clients
      let changes = {}
      try { changes = (JSON.parse(app.data_json || '{}') || {}).changes || {} } catch { changes = {} }

      const fields = []
      const values = []
      for (const [field, value] of Object.entries(changes)) {
        if (!(field in CLIENT_CHANGEABLE_FIELDS)) continue
        const v = String(value ?? '').trim()
        if (!v) continue
        fields.push(`${field} = ?`)
        values.push(v)
      }
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to apply' })
      }
      // 英文/拼音字段禁止中文（纵深防御，客户端提交时已校验）
      const noChineseFields = ['company_name_en', 'legal_representative_en', 'registered_address_en']
      if (noChineseFields.some(f => changes[f] && containsChinese(String(changes[f])))) {
        return res.status(400).json({ error: '英文/拼音字段不能包含中文' })
      }

      await db.run(
        `UPDATE clients SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
        ...values, app.client_id
      )

      await db.run("UPDATE applications SET status = 'approved' WHERE id = ?", app.id)
      await db.run(
        `INSERT INTO notifications (client_id, contract_id, type, title, message)
         VALUES (?, NULL, 'admin_message', '✅ 信息修改已通过', ?)`,
        app.client_id, '您申请的公司信息修改已由管理员审核通过并生效。'
      )
    } else {
      await db.run("UPDATE applications SET status = 'rejected' WHERE id = ?", app.id)
      await db.run(
        `INSERT INTO notifications (client_id, contract_id, type, title, message)
         VALUES (?, NULL, 'admin_message', '❌ 信息修改申请未通过', ?)`,
        app.client_id, comment ? `您申请的公司信息修改未通过。原因：${comment}` : '您申请的公司信息修改未通过，请联系管理员。'
      )
    }

    console.log(`[admin] Application ${app.id} ${action} — notified client ${app.client_id}`)
    res.json({ success: true, application_id: app.id, status: action === 'approve' ? 'approved' : 'rejected' })
  } catch (e) {
    console.error('[admin] application review error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
