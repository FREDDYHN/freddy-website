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

export async function send({ to, subject, html }) {
  const t = getTransport()
  if (t) {
    try {
      await t.sendMail({ from: FROM, to, subject, html })
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
<p style="margin-top:24px;color:#999;font-size:12px">此邮件由系统自动发送。如需帮助，请联系 zifeng.qian@outlook.com</p>
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
<p>请按照以下步骤完成 LUCID 注册：</p>
<ol>
<li>访问 <a href="https://lucid.verpackungsregister.org">lucid.verpackungsregister.org</a></li>
<li>点击 "Registrieren" 注册您的公司信息</li>
<li>获取 LUCID 注册号后，在系统中将 LIVANTO GmbH 指定为授权代表</li>
</ol>
<p>LIVANTO 授权代表 ID：<strong>（请咨询客服获取）</strong></p>
<p style="margin-top:24px;color:#999;font-size:12px">详细中文图文指南即将上线。</p>
</div>`,
  })
}

export async function sendInvoice({ email, name, invoiceNumber, amount }) {
  await send({
    to: email,
    subject: `[FREDDY] 发票 ${invoiceNumber}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#1e3a5f">电子发票</h2>
<p>${esc(name)}，您好！</p>
<p>发票号：<strong>${esc(invoiceNumber)}</strong></p>
<p>金额：<strong>€${amount}</strong></p>
<p style="color:#999;font-size:12px">FREDDY (Shanghai) Information Consulting Ltd.</p>
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
