/**
 * FREDDY Email Service — Transactional emails using SMTP
 * In development: logs to console. In production: requires SMTP_* env vars.
 */
import nodemailer from 'nodemailer'

const FROM = process.env.SMTP_FROM || 'noreply@freddy.cn'

/** Escape HTML special chars to prevent email layout injection */
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

let transporter = null

function getTransport() {
  if (transporter) return transporter
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    // Verify eagerly — failures clear transporter so first send can retry
    transporter.verify().then(() => {
      console.log('[email] SMTP connected:', process.env.SMTP_HOST)
    }).catch((e) => {
      console.error('[email] SMTP verify failed:', e.message)
      transporter = null
    })
  }
  return transporter
}

export async function send({ to, subject, html, attachments }) {
  const t = getTransport()
  if (t) {
    try {
      await t.sendMail({ from: FROM, to, subject, html, attachments })
    } catch (e) {
      console.error('[email] Send failed, resetting transporter:', e.message)
      transporter = null // force reconnect on next attempt
      throw e
    }
  } else {
    console.log(`[email] SIMULATION — To: ${to} | Subject: ${subject}`)
    console.log(`[email] Body preview: ${html.slice(0, 200)}...`)
  }
}

// ─── Templates ───

export async function sendConfirmation({ email, name, contractNumber, tier, fee }) {
  await send({
    to: email,
    subject: `[FREDDY] 合同确认 — ${contractNumber}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#1e3a5f">FREDDY 福瑞笛 — 签约确认</h2>
<p>${esc(name)}，您好！</p>
<p>您已成功签署授权代表合同：<strong>${esc(contractNumber)}</strong></p>
<table style="border-collapse:collapse;width:100%;margin:16px 0">
<tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5">套餐</td><td style="padding:8px;border:1px solid #e0e0e0">${tier === 'basic' ? '基础' : tier === 'standard' ? '标准' : '高级'} — €${fee}/年</td></tr>
</table>
<p><strong>下一步：</strong>支付年费 → 合同激活 → LUCID注册 → LIVANTO确认</p>
<p style="margin-top:24px;color:#999;font-size:12px">此邮件由系统自动发送。如需帮助，请联系 +86 152 2138 0610 或 info@freddy-epr.com</p>
</div>`,
  })
}

export async function sendLucidGuide({ email, name }) {
  await send({
    to: email,
    subject: '[FREDDY] LUCID 注册指南',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#1e3a5f">LUCID 注册指南</h2>
<p>${esc(name)}，您好！</p>
<p>授权代表服务不包含 LUCID 注册，请按以下步骤自行完成：</p>
<ol>
<li>访问 <a href="https://lucid.verpackungsregister.org">lucid.verpackungsregister.org</a></li>
<li>点击 "Registrieren" 注册公司信息</li>
<li>获取 LUCID 注册号后，在 LUCID 中搜索并选择 <strong>LIVANTO GmbH</strong> 作为授权代表（授权代表 ID：<strong>DE8514687609035</strong>）</li>
</ol>
<p>完成上述步骤后，请回到 Dashboard 确认「已在 LUCID 中完成授权」，LIVANTO 将接管除注册外的全部法定义务。</p>
<p style="margin-top:24px;color:#999;font-size:12px">如需帮助，请联系 +86 152 2138 0610 或 info@freddy-epr.com</p>
</div>`,
  })
}

export async function sendInvoiceEmail({ email, name, invoiceNumber, amount, pdfBuffer }) {
  const attachments = pdfBuffer && pdfBuffer.length
    ? [{ filename: `Rechnung-${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
    : []
  await send({
    to: email,
    subject: `[FREDDY] 发票 / Rechnung ${invoiceNumber}`,
    attachments,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#1e3a5f">电子发票 / Elektronische Rechnung</h2>
<p>${esc(name)}，您好！</p>
<p>您的授权代表年费发票已生成：</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0">
<tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5">发票号 / Rechnungsnummer</td><td style="padding:8px;border:1px solid #e0e0e0">${esc(invoiceNumber)}</td></tr>
<tr><td style="padding:8px;border:1px solid #e0e0e0;background:#f5f5f5">金额 / Betrag</td><td style="padding:8px;border:1px solid #e0e0e0"><strong>€${Number(amount).toFixed(2)}</strong></td></tr>
</table>
<p>PDF 发票见附件（德语 + 中文）。</p>
<p style="margin-top:24px;color:#999;font-size:12px">LIVANTO GmbH · Luisenhoffnung 3C, 44225 Dortmund, Deutschland</p>
<p style="color:#999;font-size:12px">此邮件由系统自动发送。</p>
</div>`,
  })
}

export async function sendReminder({ email, name, contractNumber, daysLeft, type }) {
  const urgency = daysLeft <= 5 ? '紧急' : daysLeft <= 14 ? '提醒' : '温馨提示'
  await send({
    to: email,
    subject: `[FREDDY] ${urgency}：${type === 'reporting' ? '年度数据申报' : '合同续期'} 还有 ${daysLeft} 天`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#c8a44e">${urgency}</h2>
<p>${esc(name)}，您好！</p>
<p>${type === 'reporting' ? `您的年度包装数据申报（合同 ${esc(contractNumber)}）截止日期临近` : `您的合同 ${esc(contractNumber)} 即将到期`}。</p>
<p style="font-size:24px;font-weight:bold;color:#c0392b;margin:16px 0">剩余 ${daysLeft} 天</p>
<p>请登录 Dashboard 及时处理。</p>
</div>`,
  })
}

// ═══ Email Verification ═══
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../auth.js'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

export async function sendVerificationEmail({ email, name, contractNumber, clientId }) {
  const token = jwt.sign(
    { email, client_id: clientId, purpose: 'verify-email', contract_number: contractNumber },
    JWT_SECRET,
    { expiresIn: '48h' }
  )
  const link = `${BASE_URL}/set-password/${token}`

  await send({
    to: email,
    subject: `[FREDDY] 请设置登录密码 — 合同 ${contractNumber}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#1e3a5f">FREDDY 福瑞笛 — 邮箱验证</h2>
<p>${esc(name)}，您好！</p>
<p>您的授权代表合同 <strong>${esc(contractNumber)}</strong> 已创建。</p>
<p>请点击下方链接设置登录密码，完成后即可进入 Dashboard 管理您的合同：</p>
<div style="margin:24px 0">
  <a href="${link}" style="display:inline-block;padding:12px 32px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">设置密码并登录</a>
</div>
<p style="color:#999;font-size:13px">或复制以下链接到浏览器打开：</p>
<p style="color:#999;font-size:12px;word-break:break-all">${link}</p>
<p style="margin-top:24px;color:#c0392b;font-size:13px">⚠ 此链接 48 小时内有效，过期后请重新提交申请。</p>
<p style="margin-top:24px;color:#999;font-size:12px">此邮件由系统自动发送。如需帮助，请联系 +86 152 2138 0610 或 info@freddy-epr.com</p>
</div>`,
  })
}
