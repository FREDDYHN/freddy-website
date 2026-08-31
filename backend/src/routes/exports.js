/**
 * Admin 导出（XLSX）— 三份下游对账单
 *
 * 1. GET /api/admin/export/eko-punkt?mode=initial|final&from=YYYY-MM-DD&to=YYYY-MM-DD[&scope=paid]
 *    给双元系统 EKO-PUNKT 的客户信息表（填其官方导入模板，保留双语表头）。
 *    mode=initial 预申报(estimated_quantity_kg) / mode=final 年终申报(actual_quantity_kg)；from/to 按申报日期范围（默认本年度）。
 *    scope=paid → 代缴对账单：仅含已付代缴款(recycling_prepaid)的客户，按到账月(paid_at)筛，默认当前自然月。
 * 2. GET /api/admin/export/buchhaltung?from=YYYY-MM-DD&to=YYYY-MM-DD
 *    FREDDY 财务对账单（合同号/年费/预申报费/年终申报费 + 付款时间）。
 * 3. GET /api/admin/export/livanto?from=YYYY-MM-DD&to=YYYY-MM-DD
 *    LIVANTO-FREDDY 结算单（年费 50% 转 LIVANTO，双元系统费 pass-through 不分），默认当前季度。
 *
 * 输出 XLSX（exceljs）。模板位于 backend/src/templates/，随 backend/src 一起部署。
 */
import { Router } from 'express'
import ExcelJS from 'exceljs'
import { pinyin } from 'pinyin-pro'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { getDb } from '../db.js'
import { authMiddleware, adminMiddleware } from '../auth.js'
import { localDate, beijingDateFromUtc } from '../services/date.js'
import { EKO_PUNKT, EKO_PUNKT_MATERIAL_COLS, AR_TIER_ZH } from '../../../shared/constants.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = join(__dirname, '..', 'templates')
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const router = Router()
router.use(authMiddleware, adminMiddleware)

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/** 付款方式 → 中文标签 */
function payLabel(method) {
  return { wechat: '微信', alipay: '支付宝', bank: '银行转账' }[method] || method || ''
}

/** 英文联系人名按空格拆成 Vorname / Nachname（单名整段放 Nachname） */
function splitName(full) {
  const s = String(full || '').trim()
  if (!s) return ['', '']
  const parts = s.split(/\s+/)
  if (parts.length === 1) return ['', parts[0]]
  return [parts[0], parts.slice(1).join(' ')]
}

/** 中文姓名 → [vorname, nachname]（姓=首字拼音，名=其余字拼音拼接，均首字母大写） */
function chineseNameToPinyin(name) {
  const chars = Array.from(String(name || '').trim()).filter(ch => /[一-鿿]/.test(ch))
  if (chars.length === 0) return null
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
  const py = (ch) => (pinyin(ch, { toneType: 'none', type: 'array' }) || []).join('')
  const nachname = cap(py(chars[0]))                  // 首字 → 姓
  const vorname = cap(chars.slice(1).map(py).join('')) // 其余字 → 名
  return [vorname, nachname]
}

/** 季度 → [起, 止] 日期（含端点） */
function quarterRange(year, q) {
  const map = { Q1: ['01-01', '03-31'], Q2: ['04-01', '06-30'], Q3: ['07-01', '09-30'], Q4: ['10-01', '12-31'] }
  const [m0, m1] = map[q] || map.Q1
  return [`${year}-${m0}`, `${year}-${m1}`]
}

function setXlsxHeaders(res, filename) {
  res.setHeader('Content-Type', XLSX_TYPE)
  // 文件名可能含中文（如「客户信息表」），HTTP 头必须是 ASCII：
  // 用 ASCII 回退名 + RFC 5987 filename*=UTF-8''… 百分号编码承载 UTF-8 文件名
  const asciiFallback = String(filename).replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(filename)
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`)
}

// ── 1. EKO-PUNKT 客户信息表 ──
router.get('/eko-punkt', async (req, res) => {
  try {
    const db = await getDb()
    // scope=paid → 代缴对账单（月度，已付代缴款）；否则维持全部客户导出
    const isPaid = req.query.scope === 'paid'
    const mode = isPaid ? 'initial' : (req.query.mode === 'final' ? 'final' : 'initial')
    const kgField = mode === 'final' ? 'actual_quantity_kg' : 'estimated_quantity_kg'

    // 默认日期：代缴对账单按当前自然月；普通导出按本年度
    const now = new Date()
    const year = now.getFullYear()
    let from, to
    if (isPaid) {
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
      from = req.query.from || `${year}-${m}-01`
      to = req.query.to || `${year}-${m}-${String(lastDay).padStart(2, '0')}`
    } else {
      from = req.query.from || `${year}-01-01`
      to = req.query.to || `${year}-12-31`
    }

    // WHERE：代缴按「已付代缴款 + 到账月(北京时间)」；普通按申报创建/提交日期范围
    let whereClause, params
    if (isPaid) {
      whereClause = `pd.contract_id IN (
          SELECT DISTINCT contract_id FROM payments
          WHERE payment_type = 'recycling_prepaid' AND status = 'paid'
            AND date(paid_at, '+8 hours') BETWEEN ? AND ?
        )
        AND (c.pre_declared_status IS NULL OR c.pre_declared_status != 'approved')`
      params = [from, to]
    } else {
      const dateCol = mode === 'final' ? 'coalesce(pd.submitted_at, pd.created_at)' : 'pd.created_at'
      // 预申报模式：仅导出同时满足「4 项确认条件」的客户（管理员可在 LUCID 确认授权代表）；
      //   1) 已回签(admin_stamped) 2) 年费已缴(status=active)
      //   3) 预申报费已缴(代缴 recycling_prepaid paid) 4) LUCID 密码已提交
      // 自行预申报(approved)客户因未付 recycling_prepaid 而自然排除。年终申报不筛。
      const statusFilter = mode === 'final' ? '' : ` AND (
        c.status = 'active'
        AND c.id IN (SELECT contract_id FROM payments WHERE payment_type = 'recycling_prepaid' AND status = 'paid')
        AND c.id IN (SELECT DISTINCT contract_id FROM uploads WHERE file_type = 'admin_stamped')
        AND cl.lucid_password_enc IS NOT NULL AND trim(cl.lucid_password_enc) != ''
      )`
      whereClause = `date(${dateCol}, '+8 hours') BETWEEN ? AND ?${statusFilter}`
      params = [from, to]
    }

    const rows = await db.all(
      `SELECT pd.contract_id, pd.declaration_year, pd.material_type, pd.${kgField} AS kg,
              c.contract_number,
              cl.company_name_en, cl.company_name, cl.contact_name, cl.contact_name_en, cl.contact_email,
              cl.contact_phone, cl.wechat_id, cl.registered_address_en, cl.registered_address,
              cl.uscc, cl.id_number, cl.entity_type, cl.lucid_registration_number
       FROM packaging_data pd
       JOIN contracts c ON c.id = pd.contract_id
       JOIN clients cl ON cl.id = c.client_id
       WHERE ${whereClause}
       ORDER BY pd.contract_id, pd.id`,
      ...params
    )

    // 按合同聚合：每个客户一行，材料透视成 8 列
    const byContract = new Map()
    for (const r of rows) {
      if (!byContract.has(r.contract_id)) byContract.set(r.contract_id, { ...r, materials: {} })
      byContract.get(r.contract_id).materials[r.material_type] = r.kg
    }

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(join(TEMPLATE_DIR, 'eko-punkt-import.xlsx'))
    const ws = wb.getWorksheet('Eingabe')
    if (!ws) throw new Error('模板缺少 Eingabe 工作表')

    // 清空旧数据（第 3 行样例起，保留前两行双语表头）
    for (let r = 3; r <= Math.max(ws.rowCount, 3); r++) {
      for (let c = 1; c <= 33; c++) ws.getCell(r, c).value = null
    }

    let rowIdx = 3
    for (const [, c] of byContract) {
      const [vorname, nachname] = chineseNameToPinyin(c.contact_name) || splitName(c.contact_name_en)
      const taxNo = c.entity_type === 'individual' ? (c.id_number || '') : (c.uscc || '')
      ws.getCell(rowIdx, 1).value = c.lucid_registration_number || ''
      ws.getCell(rowIdx, 2).value = c.company_name_en || c.company_name || ''
      ws.getCell(rowIdx, 3).value = EKO_PUNKT.kundengruppe
      ws.getCell(rowIdx, 4).value = EKO_PUNKT.zahlungsart
      ws.getCell(rowIdx, 5).value = EKO_PUNKT.sprache
      ws.getCell(rowIdx, 6).value = EKO_PUNKT.anrede
      ws.getCell(rowIdx, 7).value = vorname
      ws.getCell(rowIdx, 8).value = nachname
      ws.getCell(rowIdx, 9).value = c.registered_address_en || c.registered_address || ''
      // 10-12 地址补充/邮编/城市留空（地址未结构化，提交前人工补）
      ws.getCell(rowIdx, 13).value = EKO_PUNKT.land
      ws.getCell(rowIdx, 14).value = c.contact_email || ''
      ws.getCell(rowIdx, 15).value = c.contact_phone || ''
      ws.getCell(rowIdx, 16).value = c.wechat_id || ''
      // 17-23 发票地址/Ust-IdNr 留空（中国客户无欧盟 VAT）
      ws.getCell(rowIdx, 24).value = taxNo
      ws.getCell(rowIdx, 25).value = c.declaration_year || ''
      // 左对齐：姓名(7/8)、地址(9)、税号(24)
      for (const col of [7, 8, 9, 24]) {
        ws.getCell(rowIdx, col).alignment = { horizontal: 'left' }
      }
      for (const { key, col } of EKO_PUNKT_MATERIAL_COLS) {
        const kg = c.materials[key]
        if (kg != null && Number(kg) > 0) {
          const cell = ws.getCell(rowIdx, col)
          cell.value = Number(Number(kg).toFixed(3))
          cell.numFmt = '0.000'                        // 固定 3 位小数（区域无关，Excel 本地化显示）
          cell.alignment = { horizontal: 'right' }     // 数字右对齐
        }
      }
      rowIdx++
    }

    // 统一字体：模板表头中德文混排 + 数据区 Arial/Calibri 混用，统一为微软雅黑（保留原字号/加粗）
    for (let r = 1; r < rowIdx; r++) {
      for (let c = 1; c <= 33; c++) {
        const cell = ws.getCell(r, c)
        if (cell.value == null) continue
        const f = cell.font || {}
        cell.font = { name: '微软雅黑', size: f.size || 11, bold: !!f.bold, ...(f.color ? { color: f.color } : {}) }
      }
    }

    const buf = await wb.xlsx.writeBuffer()
    const filename = isPaid
      ? `freddy-eko-punkt-dai-jiao-${from}_${to}.xlsx`
      : `${from}_${to.slice(5)}_EASY-LIZE-Import-China_Agencies_客户信息表.xlsx`
    setXlsxHeaders(res, filename)
    res.send(buf)
  } catch (e) {
    console.error('[export] eko-punkt error:', e)
    if (!res.headersSent) res.status(500).json({ error: e.message })
    else res.end()
  }
})

// ── 2. Buchhaltung 对账单 ──
router.get('/buchhaltung', async (req, res) => {
  try {
    const db = await getDb()
    const year = new Date().getFullYear()
    const from = req.query.from || `${year}-01-01`
    const to = req.query.to || `${year}-12-31`

    // 时间范围作用于付款时间（paid_at，pending 回退 created_at），北京时间
    const rows = await db.all(
      `SELECT c.id AS contract_id, c.contract_number, c.annual_fee_eur,
              cl.company_name, cl.uscc, cl.id_number, cl.entity_type
       FROM contracts c JOIN clients cl ON cl.id = c.client_id
       WHERE c.id IN (
         SELECT DISTINCT contract_id FROM payments
         WHERE payment_type IN ('contract_fee','recycling_prepaid','recycling_settlement')
           AND date(coalesce(paid_at, created_at), '+8 hours') BETWEEN ? AND ?
       )
       ORDER BY c.id`,
      from, to
    )

    const contractIds = rows.map(r => r.contract_id)
    const payments = contractIds.length > 0
      ? await db.all(
          `SELECT contract_id, payment_type, amount_eur, paid_at, created_at, payment_method
           FROM payments WHERE contract_id IN (${contractIds.map(() => '?').join(',')})
             AND payment_type IN ('contract_fee','recycling_prepaid','recycling_settlement')
           ORDER BY id DESC`,
          ...contractIds
        )
      : []

    // 每个合同每种费取最新一条
    const pmByContract = {}
    for (const p of payments) {
      if (!pmByContract[p.contract_id]) pmByContract[p.contract_id] = {}
      if (!pmByContract[p.contract_id][p.payment_type]) pmByContract[p.contract_id][p.payment_type] = p
    }

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(join(TEMPLATE_DIR, 'buchhaltung.xlsx'))
    const ws = wb.worksheets[0]
    if (!ws) throw new Error('模板缺少工作表')

    // 清空第 2 行样例数据（保留第 1 行表头）
    for (let r = 2; r <= Math.max(ws.rowCount, 2); r++) {
      for (let c = 1; c <= 10; c++) ws.getCell(r, c).value = null
    }

    let rowIdx = 2
    for (const r of rows) {
      const fee = pmByContract[r.contract_id]?.contract_fee
      const prepaid = pmByContract[r.contract_id]?.recycling_prepaid
      const settle = pmByContract[r.contract_id]?.recycling_settlement
      const taxNo = r.entity_type === 'individual' ? (r.id_number || '') : (r.uscc || '')
      const method = fee?.payment_method || prepaid?.payment_method || settle?.payment_method || ''
      ws.getCell(rowIdx, 1).value = r.contract_number || ''
      ws.getCell(rowIdx, 2).value = r.company_name || ''
      ws.getCell(rowIdx, 3).value = taxNo
      ws.getCell(rowIdx, 4).value = r.annual_fee_eur != null ? Number(r.annual_fee_eur) : ''
      ws.getCell(rowIdx, 5).value = fee && fee.paid_at ? beijingDateFromUtc(fee.paid_at) : ''
      ws.getCell(rowIdx, 6).value = prepaid && prepaid.amount_eur != null ? Number(prepaid.amount_eur) : ''
      ws.getCell(rowIdx, 7).value = prepaid && prepaid.paid_at ? beijingDateFromUtc(prepaid.paid_at) : ''
      ws.getCell(rowIdx, 8).value = settle && settle.amount_eur != null ? Number(settle.amount_eur) : ''
      ws.getCell(rowIdx, 9).value = settle && settle.paid_at ? beijingDateFromUtc(settle.paid_at) : ''
      ws.getCell(rowIdx, 10).value = payLabel(method)
      rowIdx++
    }

    const buf = await wb.xlsx.writeBuffer()
    setXlsxHeaders(res, `freddy-buchhaltung-${from}_${to}.xlsx`)
    res.send(buf)
  } catch (e) {
    console.error('[export] buchhaltung error:', e)
    if (!res.headersSent) res.status(500).json({ error: e.message })
    else res.end()
  }
})

// ── 3. LIVANTO-FREDDY 季度结算单 ──
router.get('/livanto', async (req, res) => {
  try {
    const db = await getDb()
    // 默认当前自然季度，可用 from/to 覆盖为任意日期范围
    const now = new Date()
    const defQuarter = 'Q' + (Math.floor(now.getMonth() / 3) + 1)
    const [defFrom, defTo] = quarterRange(now.getFullYear(), defQuarter)
    const from = req.query.from || defFrom
    const to = req.query.to || defTo

    // 该时间段内「实收年费」的合同（contract_fee 已付且付款时间落在范围内）
    const rows = await db.all(
      `SELECT c.id AS contract_id, c.contract_number, c.tier, c.annual_fee_eur,
              cl.company_name_en, cl.company_name
       FROM contracts c JOIN clients cl ON cl.id = c.client_id
       WHERE c.id IN (
         SELECT DISTINCT contract_id FROM payments
         WHERE payment_type = 'contract_fee' AND status = 'paid'
           AND date(paid_at, '+8 hours') BETWEEN ? AND ?
       )
       ORDER BY c.id`,
      from, to
    )

    const contractIds = rows.map(r => r.contract_id)
    const payments = contractIds.length > 0
      ? await db.all(
          `SELECT contract_id, payment_type, amount_eur
           FROM payments WHERE contract_id IN (${contractIds.map(() => '?').join(',')})
             AND payment_type IN ('recycling_prepaid','recycling_settlement') AND status = 'paid'`,
          ...contractIds
        )
      : []

    // 双元系统费（代收代付，不分）合计
    const dualByContract = {}
    for (const p of payments) {
      dualByContract[p.contract_id] = round2((dualByContract[p.contract_id] || 0) + Number(p.amount_eur || 0))
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(`${from} ~ ${to} 结算`)
    const headers = ['合同编号', '客户名称', '服务等级', '年度基本费用(€)', '转 LIVANTO 50%(€)', '附加服务费(€)', '双元系统费(€,代收代付不分)', '合计转 LIVANTO(€)']
    ws.addRow(headers)
    ws.getRow(1).font = { bold: true }

    let totalToLivanto = 0
    for (const r of rows) {
      const split = round2(Number(r.annual_fee_eur || 0) * 0.5)
      totalToLivanto = round2(totalToLivanto + split)
      const name = [r.company_name_en, r.company_name].filter(Boolean).join(' / ')
      ws.addRow([
        r.contract_number || '',
        name,
        AR_TIER_ZH[r.tier] || r.tier || '',
        Number(r.annual_fee_eur) || '',
        split,
        '', // 附加服务费暂不做，手动补
        dualByContract[r.contract_id] != null ? dualByContract[r.contract_id] : '',
        split,
      ])
    }

    // 合计行
    const totalRow = ws.addRow(['合计', '', '', '', totalToLivanto, '', '', totalToLivanto])
    totalRow.font = { bold: true }

    // 列宽
    const widths = [22, 40, 12, 16, 16, 14, 22, 16]
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w })
    // 金额列两位小数
    ;[4, 5, 6, 7, 8].forEach(c => {
      ws.getColumn(c).numFmt = '#,##0.00'
    })

    const buf = await wb.xlsx.writeBuffer()
    setXlsxHeaders(res, `freddy-livanto-${from}_${to}.xlsx`)
    res.send(buf)
  } catch (e) {
    console.error('[export] livanto error:', e)
    if (!res.headersSent) res.status(500).json({ error: e.message })
    else res.end()
  }
})

export default router
