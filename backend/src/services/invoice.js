/**
 * Invoice generation — 双语（德语+中文）PDF 发票
 * 用服务器已装的 wkhtmltopdf 把 HTML 转成 PDF，再邮件发给客户。
 * 只针对授权代表年费（contract_fee），0% 增值税（非欧盟客户 nicht steuerbar）。
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { getDb } from '../db.js'
import { sendInvoiceEmail } from './email.js'

const execFileAsync = promisify(execFile)

const LIVANTO = {
  name: 'LIVANTO GmbH',
  address: 'Luisenhoffnung 3C, 44225 Dortmund, Deutschland',
  ustId: 'DE464031041',
  hrb: 'HRB38628',
  geschaeftsfuehrer: 'Zifeng Qian',
  bank: { kontoinhaber: 'LIVANTO GmbH', bank: 'Postbank', iban: 'DE11 4667 0204 0080 8352 00', bic: 'DEUTDEDWP03' },
}

const FREDDY = {
  kontoinhaber: 'FREDDY (SHANGHAI) INFORMATION CONSULTING LTD. HN',
  bank: 'BANK OF CHINA HUAINAN BRANCH',
  kontonummer: '181276312093',
  swift: 'BKCHCNBJ780',
  bankadresse: 'NO.21, LONGHU ROAD, HUAINAN CITY, CHINA',
}

const TIER_DE = { basic: 'Basis', standard: 'Standard', premium: 'Premium' }
const TIER_ZH = { basic: '基础', standard: '标准', premium: '高级' }

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

/** 发票号 = 合同号 + '-' + YYMM（如 LTO-AR-2026-0006-2607 = 2026年7月） */
export function formatInvoiceNumber(contractNumber, d = new Date()) {
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${contractNumber}-${yy}${mm}`
}

/** 拼双语 HTML 发票（wkhtmltopdf 兼容：table 布局 + 内联样式） */
export function buildInvoiceHtml(invoice, client, contract) {
  const tier = contract?.tier || 'basic'
  const tierDe = TIER_DE[tier] || tier
  const tierZh = TIER_ZH[tier] || tier
  const amount = Number(invoice.amount_eur || contract?.annual_fee_eur || 0)
  const amt = amount.toFixed(2)
  const date = (invoice.invoice_date || '').slice(0, 10)
  const period = `${(contract?.start_date || '').slice(0, 10)} – ${(contract?.end_date || '').slice(0, 10)}`

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><style>
  body { font-family:'Noto Serif CJK SC','SimSun','Times New Roman',serif; color:#222; font-size:12px; margin:0; }
  .header { border-bottom:2px solid #1e3a5f; padding-bottom:10px; margin-bottom:18px; }
  .header strong { font-size:15px; color:#1e3a5f; }
  .title { font-size:22px; font-weight:bold; color:#1e3a5f; margin:18px 0 6px; }
  table { border-collapse:collapse; width:100%; margin:10px 0; }
  td, th { padding:6px 8px; border:1px solid #ccc; font-size:12px; }
  th { background:#eef1f5; text-align:left; }
  .meta td { border:none; }
  .meta td:first-child { width:42%; color:#666; }
  .right { text-align:right; }
  .total td { border:none; }
  .total td:first-child { width:70%; }
  .total td:last-child { text-align:right; }
  .bank { margin-top:22px; padding:10px; background:#f7f7f7; border:1px solid #ddd; font-size:11px; }
  .note { color:#777; font-size:10px; }
  .zh { color:#444; }
</style></head>
<body>
  <div class="header">
    <strong>${esc(LIVANTO.name)}</strong><br>
    ${esc(LIVANTO.address)}<br>
    USt-ID: ${esc(LIVANTO.ustId)} &nbsp;|&nbsp; Handelsregister: ${esc(LIVANTO.hrb)} &nbsp;|&nbsp; Geschäftsführer: ${esc(LIVANTO.geschaeftsfuehrer)}
  </div>

  <div>
    <strong>Rechnungsempfänger / 客户：</strong><br>
    ${esc(client.company_name_en || '')} &nbsp; ${esc(client.company_name || '')}<br>
    ${esc(client.registered_address || '')}${client.registered_address_en ? `<br>${esc(client.registered_address_en)}` : ''}${client.entity_type === 'individual' ? (client.id_number ? `<br>身份证号: ${esc(client.id_number)}` : '') : (client.uscc ? `<br>USt-ID / 税号: ${esc(client.uscc)}` : '')}
  </div>

  <div class="title">Rechnung / 发票</div>

  <table class="meta">
    <tr><td>Rechnungsnummer / 发票编号</td><td>${esc(invoice.invoice_number)}</td></tr>
    <tr><td>Rechnungsdatum / 开票日期</td><td>${esc(date)}</td></tr>
    <tr><td>Leistungszeitraum / 服务周期</td><td>${esc(period)}</td></tr>
  </table>

  <table>
    <tr><th>Leistungsbeschreibung / 服务内容</th><th>Menge / 数量</th><th>Einzelpreis / 单价</th><th>Gesamtpreis / 总价</th></tr>
    <tr>
      <td>Bevollmächtigten-Jahresgebühr (${esc(tierDe)})<br><span class="zh">授权代表年费（${esc(tierZh)}）</span></td>
      <td class="right">1</td>
      <td class="right">€${amt}</td>
      <td class="right">€${amt}</td>
    </tr>
  </table>

  <table class="total">
    <tr><td>Netto / 净额</td><td class="right">€${amt}</td></tr>
    <tr><td>Umsatzsteuer 0% / 增值税 0%<br><span class="note">nicht steuerbar / 不含德国增值税</span></td><td class="right">€0.00</td></tr>
    <tr><td><strong>Gesamtbetrag / 总计</strong></td><td class="right"><strong>€${amt}</strong></td></tr>
  </table>

  <div class="bank">
    <strong>Bankverbindung / 银行信息</strong><br>
    Kontoinhaber: ${esc(LIVANTO.bank.kontoinhaber)} &nbsp;|&nbsp; Bank: ${esc(LIVANTO.bank.bank)}<br>
    IBAN: ${esc(LIVANTO.bank.iban)} &nbsp;|&nbsp; BIC(SWIFT): ${esc(LIVANTO.bank.bic)}
    <br><br>
    <span class="note">Gemäß Dreiparteienvertrag ist FREDDY die Inkassostelle / 根据三方合同，FREDDY 为代收款方：</span><br>
    Kontoinhaber: ${esc(FREDDY.kontoinhaber)} &nbsp;|&nbsp; Bank: ${esc(FREDDY.bank)}<br>
    Kontonummer: ${esc(FREDDY.kontonummer)} &nbsp;|&nbsp; Swift-Code: ${esc(FREDDY.swift)}<br>
    Bankadresse: ${esc(FREDDY.bankadresse)}<br>
    户名：福瑞笛（上海）信息咨询有限公司淮南分公司 &nbsp;|&nbsp; 开户行：中国银行股份有限公司淮南分行<br>
    账号：181276312093 &nbsp;|&nbsp; 银行代码：BKCHCNBJ780 &nbsp;|&nbsp; 开户行地址：安徽省淮南市龙湖路21号
  </div>
</body>
</html>`
}

/** HTML → PDF（wkhtmltopdf） */
export async function generateInvoicePdf(html) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'inv-'))
  const htmlPath = path.join(tmpDir, 'invoice.html')
  const pdfPath = path.join(tmpDir, 'invoice.pdf')
  await fs.writeFile(htmlPath, html, 'utf8')
  try {
    await execFileAsync('wkhtmltopdf', [
      '--page-size', 'A4',
      '--margin-top', '15mm', '--margin-bottom', '15mm', '--margin-left', '15mm', '--margin-right', '15mm',
      '--encoding', 'utf-8', '--quiet', htmlPath, pdfPath,
    ])
    return await fs.readFile(pdfPath)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

/** 生成并发送发票：取客户/合同 → 拼 HTML → 转 PDF → 邮件（失败只记日志，不抛给调用方） */
export async function generateAndSendInvoice(invoice) {
  try {
    const db = await getDb()
    const client = await db.get('SELECT * FROM clients WHERE id = ?', invoice.client_id)
    const contract = await db.get('SELECT * FROM contracts WHERE id = ?', invoice.contract_id)
    if (!client || !contract) { console.warn('[invoice] client/contract not found, skip'); return }

    const html = buildInvoiceHtml(invoice, client, contract)
    const pdf = await generateInvoicePdf(html)
    await sendInvoiceEmail({
      email: client.contact_email,
      name: client.contact_name || client.company_name,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount_eur,
      pdfBuffer: pdf,
    })
    console.log(`[invoice] Sent ${invoice.invoice_number} to ${client.contact_email}`)
  } catch (e) {
    console.error('[invoice] generate/send failed:', e.message)
  }
}
