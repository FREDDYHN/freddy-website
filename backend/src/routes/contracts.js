import { Router } from 'express'
import { getDb, getRate, withTransaction } from '../db.js'
import { authMiddleware } from '../auth.js'
import { createPaymentOrder, insertPaymentRow } from '../payment.js'
import { generateContract, getContractUrl } from '../services/contract-gen.js'
import { sendVerificationEmail, sendLucidGuide } from '../services/email.js'
import { rateLimit } from '../rate-limiter.js'
import { AR_TIER_FEES_EUR, WEEE_PRICES, BATTERY_PRICES, containsChinese, taxError, needsVatId, FOREIGN_TAX_RE, calcMaterialFee, applyFloorFee } from '../../../shared/constants.js'

const router = Router()

// 合同号 = 前缀 + 年份 + 自增 id 补零（如 LTO-AR-2026-0006）。
// 用 AUTOINCREMENT 的 lastID 派生，而非 MAX(id)+1 —— 删除合同后编号不复用、也不会因并发/删除而撞号。
function formatContractNumber(type, id) {
  const prefix = type === 'weee' ? 'LTO-WEEE-' : type === 'battery' ? 'LTO-BATT-' : 'LTO-AR-'
  return prefix + new Date().getFullYear() + '-' + String(id).padStart(4, '0')
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
 * 格式化为 YYYY-MM-DD（北京时间/服务器本地时区）。
 * 不能用 toISOString()：它按 UTC 输出，在 Asia/Shanghai(UTC+8) 会早一天，
 * 导致合同 start_date/end_date 变成上个月最后一天 / 12-30 而非 09-01 / 12-31。
 */
function dateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calculate contract period (自然年):
 *   - Start: first day of NEXT month (gives client time to prepare)
 *   - End:   Dec 31 of the start year (calendar year)
 *
 * Examples:
 *   signed on 2026-07-15 → start 2026-08-01, end 2026-12-31
 *   signed on 2026-12-15 → start 2027-01-01, end 2027-12-31
 */
function contractPeriod() {
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonth = now.getMonth() + 1  // next calendar month (0-indexed)
  const start = new Date(startYear, startMonth, 1)
  const end = new Date(start.getFullYear(), 11, 31)  // 自然年：当年12月31日
  return {
    startDate: dateStr(start),
    endDate: dateStr(end),
  }
}

// POST /api/contracts — Create new contract (public: called during signup flow)
// Rate limited: 3 per 10 min per IP
router.post('/', rateLimit('contract-create', 3, 10 * 60 * 1000), async (req, res) => {
  const db = await getDb()
  try {
    const { service_type, company_name, company_name_en, registered_address, registered_address_en, entity_type, uscc, id_number, country, vat_id, legal_representative, legal_representative_en,
            contact_person, contact_person_en, contact_email, contact_phone, wechat_id,
            packaging_items, tier, device_categories, brand_count, year_type } = req.body

    // ── 校验（事务外，避免事务内提前 return 泄漏连接）──
    if (!company_name || !company_name_en || !contact_person || !contact_person_en || !contact_email || !registered_address || !registered_address_en || !contact_phone || !wechat_id) {
      return res.status(400).json({ error: 'Missing required fields: company_name, company_name_en, contact_person, contact_person_en, contact_email, registered_address, registered_address_en, contact_phone, wechat_id' })
    }
    // 英文/拼音字段禁止中文
    if (containsChinese(company_name_en) || containsChinese(registered_address_en) || containsChinese(legal_representative_en) || containsChinese(contact_person_en)) {
      return res.status(400).json({ error: '英文/拼音字段不能包含中文' })
    }
    // 税号必填：公司 → 统一社会信用代码；个人 → 身份证号码；境外 → 宽松税号
    const entityType = entity_type === 'individual' ? 'individual' : 'company'
    const countryCode = (country || 'CN').trim().toUpperCase() || 'CN'
    const taxValue = entityType === 'individual' ? id_number : uscc
    const taxErr = taxError(countryCode, entityType, taxValue)
    if (taxErr) return res.status(400).json({ error: taxErr })
    if (needsVatId(countryCode)) {
      const v = String(vat_id || '').trim()
      if (!v) return res.status(400).json({ error: 'Umsatzsteuer ID Nummer（增值税号）必填' })
      if (!FOREIGN_TAX_RE.test(v.toUpperCase())) return res.status(400).json({ error: '增值税号格式不正确（4-20位字母或数字）' })
    }
    if (contact_phone) {
      const phoneExists = await db.get('SELECT id FROM clients WHERE contact_phone = ? AND contact_email != ?', contact_phone, contact_email)
      if (phoneExists) return res.status(400).json({ error: '该手机号已被注册，请使用其他手机号' })
    }

    // 防止重复签约：同一邮箱已有合同时直接返回，不再新建重复合同
    const dupClient = await db.get('SELECT id FROM clients WHERE contact_email = ?', contact_email)
    if (dupClient) {
      const dupContract = await db.get(
        'SELECT id, contract_number FROM contracts WHERE client_id = ? ORDER BY id DESC LIMIT 1',
        dupClient.id
      )
      if (dupContract) {
        return res.status(409).json({
          error: '该邮箱已签约，请直接登录查看您的合同',
          contract_number: dupContract.contract_number,
        })
      }
    }

    const svcType = service_type || 'packaging'
    const isPackaging = svcType === 'packaging'

    // 包装法（AR）：至少填一类材料用量，否则 EKO-PUNKT 上传缺核心数据
    if (isPackaging && !(Array.isArray(packaging_items) && packaging_items.some(it => it && Number(it.estimated_kg) > 0))) {
      return res.status(400).json({ error: '请至少填写一类包装材料的预估年量（kg > 0）' })
    }

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

    // ── 先网络下单（在事务外，避免 BEGIN IMMEDIATE 持有写锁期间做 1-5s 的微信/支付宝 fetch）──
    const order = await createPaymentOrder({ tier: contractTier, method: 'wechat', amountEur: annualFee })

    // ── 事务：只做 DB 写（下单结果 order 已备好，事务内仅 insertPaymentRow）──
    const { clientId, contractId, contractNumber, startDate, endDate } = await withTransaction(db, async () => {
      // 1. Create or reuse client (by email)
      let clientId
      const existingClient = await db.get('SELECT id FROM clients WHERE contact_email = ?', contact_email)
      if (existingClient) {
        clientId = existingClient.id
        // Update existing client with latest info
        await db.run(
          'UPDATE clients SET company_name=?, company_name_en=?, registered_address=?, registered_address_en=?, entity_type=?, uscc=?, id_number=?, country=?, vat_id=?, legal_representative=?, legal_representative_en=?, contact_name=?, contact_name_en=?, contact_phone=?, wechat_id=? WHERE id=?',
          company_name, company_name_en || '', registered_address || '', registered_address_en || '', entityType, uscc || '', id_number || '', countryCode, vat_id || '', legal_representative || '', legal_representative_en || '', contact_person || '', contact_person_en || '', contact_phone || '', wechat_id || '', clientId
        )
      } else {
        const clientResult = await db.run(
          'INSERT INTO clients (company_name, company_name_en, registered_address, registered_address_en, entity_type, uscc, id_number, country, vat_id, legal_representative, legal_representative_en, contact_name, contact_name_en, contact_email, contact_phone, wechat_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          company_name, company_name_en || '', registered_address || '', registered_address_en || '', entityType, uscc || '', id_number || '', countryCode, vat_id || '', legal_representative || '', legal_representative_en || '', contact_person || '', contact_person_en || '', contact_email, contact_phone || '', wechat_id || ''
        )
        clientId = clientResult.lastID
      }

      // 2. Create contract（先插临时唯一号，再取 lastID 派生正式号，同事务内更新）
      const { startDate, endDate } = contractPeriod()
      const tmpNumber = '__tmp__' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      const contractResult = await db.run(
        'INSERT INTO contracts (client_id, contract_number, tier, annual_fee_eur, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        clientId, tmpNumber, contractTier, annualFee, startDate, endDate, 'pending_verification'
      )
      const contractId = contractResult.lastID
      const contractNumber = formatContractNumber(svcType, contractId)
      await db.run('UPDATE contracts SET contract_number = ? WHERE id = ?', contractNumber, contractId)

      // 3. Store service-specific data
      if (isPackaging && packaging_items && packaging_items.length > 0) {
        for (const item of packaging_items) {
          await db.run(
            'INSERT INTO packaging_data (contract_id, declaration_year, material_type, packaging_category, example, estimated_quantity_kg) VALUES (?, ?, ?, ?, ?, ?)',
            contractId, new Date().getFullYear(), item.material_type, item.category || 'B2C', item.example || '', item.estimated_kg || 0
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

      // 4. 写支付行（复用事务外预先下好的单，纯 DB 写）
      await insertPaymentRow(db, clientId, contractId, 'wechat', order)

      // 4b. 写回收预申报费待付款行（签约时锁定汇率，与年费同汇率，避免客户付款后管理员核对时汇率漂移）
      if (isPackaging) {
        const byMat = {}
        for (const it of (packaging_items || [])) {
          const mk = it.material_type
          if (!mk) continue
          const kg = Number(it.estimated_kg) || 0
          byMat[mk] = (byMat[mk] || 0) + kg
        }
        let prepaidFee = 0
        for (const [mk, kg] of Object.entries(byMat)) prepaidFee += calcMaterialFee(mk, kg)
        prepaidFee = applyFloorFee(prepaidFee, 28.90)
        const prepaidCny = Math.round(prepaidFee * order.rate * 100) / 100
        await db.run(
          "INSERT INTO payments (client_id, contract_id, payment_type, amount_cny, amount_eur, payment_method, out_trade_no, status, rate_used, rate_locked_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))",
          clientId, contractId, 'recycling_prepaid', prepaidCny, prepaidFee, 'bank', 'EPR-PRE-' + contractId, 'pending', order.rate
        )
      }

      // 5. Create user account (email_verified=0, password set later via verification email)
      const existingUser = await db.get('SELECT id FROM users WHERE email = ?', contact_email)
      if (!existingUser) {
        await db.run(
          "INSERT INTO users (email, password_hash, role, client_id, email_verified) VALUES (?, '', 'client', ?, 0)",
          contact_email, clientId
        )
      }

      return { clientId, contractId, contractNumber, startDate, endDate }
    })

    // 支付响应信息（来自事务外预先下好的单）
    const payment = { outTradeNo: order.tradeNo, cnyAmount: order.cny, eurAmount: order.eur, payUrl: order.url, qrCodeUrl: order.qr, rateUsed: order.rate }

    // 6. Send verification email (non-blocking, after commit)
    try {
      await sendVerificationEmail({ email: contact_email, name: contact_person || company_name, contractNumber, clientId })
    } catch (e) { console.error('[contracts] Verification email failed:', e.message) }

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
          entity_type: entityType, uscc: uscc || '', id_number: id_number || '',
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
      message: '合同已创建。请查收验证邮件并设置登录密码。',
    })
  } catch (e) {
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
    if (client) delete client.lucid_password_enc
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
    if (contract.status !== 'pending_payment' && contract.status !== 'pending_verification') {
      return res.status(400).json({ error: `Cannot sign a contract with status: ${contract.status}` })
    }

    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown'
    await db.run(
      "UPDATE contracts SET status = 'signed', signed_at = datetime('now'), signed_ip = ? WHERE id = ? AND (status = 'pending_payment' OR status = 'pending_verification')",
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

// POST /api/contracts/:id/request-predeclared — Client self-marks "already pre-declared" (pending admin review)
router.post('/:id/request-predeclared', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    if (req.user.role !== 'admin' && contract.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    await db.run("UPDATE contracts SET pre_declared_status = 'pending' WHERE id = ?", req.params.id)
    res.json({ success: true })
  } catch (e) {
    console.error('[contracts] request-predeclared error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/contracts/:id/cancel-predeclared — Client withdraws "already pre-declared" request
router.post('/:id/cancel-predeclared', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    if (req.user.role !== 'admin' && contract.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    await db.run('UPDATE contracts SET pre_declared_status = NULL WHERE id = ?', req.params.id)
    res.json({ success: true })
  } catch (e) {
    console.error('[contracts] cancel-predeclared error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/contracts/:id/submit-actuals — Submit actual packaging quantities (auth required)
router.post('/:id/submit-actuals', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', req.params.id)
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    if (req.user.role !== 'admin' && contract.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { items } = req.body
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array required' })

    await withTransaction(db, async () => {
      for (const item of items) {
        await db.run(
          'UPDATE packaging_data SET actual_quantity_kg = ?, submitted_at = datetime(\'now\') WHERE contract_id = ? AND material_type = ?',
          parseFloat(item.actual_kg), req.params.id, item.material_type
        )
      }

      // 提交实际量时即锁定年终结算费（补缴）的汇率，避免后续对账漂移。
      // 计算规则与 admin-notifications.js 审核兜底一致（§5(3) 惩罚金/退款封顶）。
      const pkg = await db.all('SELECT material_type, estimated_quantity_kg, actual_quantity_kg FROM packaging_data WHERE contract_id = ?', req.params.id)
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
        // 仅「补缴」（正值）锁定汇率建行；退款/持平不涉及客户付人民币，维持前端实时展示
        if (settle > 0) {
          const rate = await getRate()
          const settleCny = Math.round(settle * rate * 100) / 100
          const existing = await db.get("SELECT id FROM payments WHERE contract_id = ? AND payment_type = 'recycling_settlement'", req.params.id)
          if (existing) {
            await db.run("UPDATE payments SET amount_eur = ?, amount_cny = ?, rate_used = ?, rate_locked_at = datetime('now'), status = 'pending' WHERE id = ?", settle, settleCny, rate, existing.id)
          } else {
            await db.run(
              "INSERT INTO payments (client_id, contract_id, payment_type, amount_cny, amount_eur, payment_method, out_trade_no, status, rate_used, rate_locked_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))",
              contract.client_id, req.params.id, 'recycling_settlement', settleCny, settle, 'bank', 'EPR-SET-' + req.params.id, 'pending', rate
            )
          }
        }
      }
    })

    const packaging = await db.all('SELECT * FROM packaging_data WHERE contract_id = ?', req.params.id)
    res.json({ success: true, packaging })
  } catch (e) {
    console.error('[contracts] submit-actuals error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/contracts/:id/send-lucid-guide — Email LUCID registration guide to client (auth required)
router.post('/:id/send-lucid-guide', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const contract = await db.get(
      'SELECT c.*, cl.contact_email, cl.contact_name FROM contracts c JOIN clients cl ON c.client_id = cl.id WHERE c.id = ?',
      req.params.id
    )
    if (!contract) return res.status(404).json({ error: 'Contract not found' })
    if (req.user.role !== 'admin' && contract.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (!contract.contact_email) return res.status(400).json({ error: 'Client email missing' })

    await sendLucidGuide({ email: contract.contact_email, name: contract.contact_name })
    res.json({ success: true })
  } catch (e) {
    console.error('[contracts] send-lucid-guide error:', e)
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
