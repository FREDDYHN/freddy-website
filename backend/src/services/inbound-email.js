/**
 * FREDDY Inbound Email Service — 统一收发邮件·收件
 *
 * 轮询企业邮箱 info@freddy-epr.com 收件箱（IMAP），把 EKO-PUNKT 等外部合作方发来的
 * 客户材料归档到 inbound_documents 表，进入后台「待人工」队列，管理员审阅后转发给客户。
 *
 * 未配置 IMAP_* 环境变量时静默跳过（不报错、不影响启动），方便先部署地基、后接凭证。
 */
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getDb } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// __dirname = backend/src/services；三级上溯到项目根，附件存 uploads/inbound/
const INBOUND_DIR = join(__dirname, '..', '..', '..', 'uploads', 'inbound')

const DEFAULT_POLL_MS = 5 * 60 * 1000 // 5 分钟

export function isImapConfigured() {
  return !!(process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASS)
}

function ensureDir() {
  if (!fs.existsSync(INBOUND_DIR)) fs.mkdirSync(INBOUND_DIR, { recursive: true })
}

/** 清洗附件文件名：只保留字母/数字/点/下划线/连字符/中文，其余转下划线 */
function safeName(raw) {
  const base = String(raw || 'attachment').replace(/[^a-zA-Z0-9._\-一-龥]/g, '_').slice(-120)
  return base || 'attachment'
}

/** 落盘单个附件，返回 { filename, stored_path, size, mime } */
function saveAttachment(att, uid) {
  const filename = safeName(att.filename)
  const stored = `${uid}-${Date.now()}-${filename}`
  fs.writeFileSync(join(INBOUND_DIR, stored), att.content)
  return {
    filename: att.filename || filename,
    stored_path: `inbound/${stored}`,
    size: att.size || att.content.length,
    mime: att.contentType || 'application/octet-stream',
  }
}

/**
 * 轻量自动匹配：根据发件人邮箱 / 客户公司名在正文中出现，尝试把邮件归到唯一客户。
 * 只做「唯一命中」才返回，否则留空交给人工——绝不误配。
 */
async function autoMatchClient(db, senderEmail, subject, bodyText) {
  const haystack = `${subject || ''}\n${bodyText || ''}`
  // 1) 发件人邮箱直接等于客户邮箱
  if (senderEmail) {
    const byEmail = await db.get(
      'SELECT id, company_name, contact_email FROM clients WHERE lower(contact_email) = lower(?)',
      senderEmail
    )
    if (byEmail) return { client_id: byEmail.id, hint: `email:${byEmail.contact_email}` }
  }
  // 2) 客户公司名（中文/英文）在标题或正文中出现
  const clients = await db.all(
    "SELECT id, company_name, company_name_en FROM clients WHERE (company_name IS NOT NULL AND company_name != '') OR (company_name_en IS NOT NULL AND company_name_en != '')"
  )
  const matches = []
  for (const c of clients) {
    const names = [c.company_name, c.company_name_en].filter(n => n && n.trim().length >= 3)
    if (names.some(n => haystack.includes(n.trim()))) matches.push(c)
  }
  if (matches.length === 1) {
    return { client_id: matches[0].id, hint: matches[0].company_name || matches[0].company_name_en }
  }
  return null
}

/** 拉取一次收件箱，返回 { processed, skipped, exists } 统计 */
export async function pollInbox() {
  if (!isImapConfigured()) return { skipped: true, reason: 'IMAP not configured' }

  const db = await getDb()
  ensureDir()

  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASS },
    logger: false,
  })

  let processed = 0
  let skipped = 0
  let exists = 0

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      exists = client.mailbox.exists || 0

      // Pass 1：只取 envelope，先按 message_id 去重，找出「新邮件」的 uid
      const newUids = []
      for await (const msg of client.fetch('1:*', { envelope: true, uid: true })) {
        const messageId = msg.envelope?.messageId || `uid-${msg.uid}`
        const existing = await db.get('SELECT id FROM inbound_documents WHERE message_id = ?', messageId)
        if (existing) skipped++
        else newUids.push(msg.uid)
      }

      // Pass 2：只下载新邮件完整 source，解析归档
      for (const uid of newUids) {
        try {
          const dl = await client.download(uid, null, { uid: true })
          const parsed = await simpleParser(dl.content) // 流直接交给 mailparser

          const messageId = parsed.messageId || `uid-${uid}`
          const sender = parsed.from?.value?.[0]
          const attachments = (parsed.attachments || [])
            .filter(a => a.content && a.content.length > 0)
            .map(a => saveAttachment(a, uid))

          const match = await autoMatchClient(
            db,
            sender?.address || '',
            parsed.subject || '',
            parsed.text || ''
          )

          await db.run(
            `INSERT INTO inbound_documents
               (message_id, sender_email, sender_name, subject, body_text, received_at, client_id, match_hint, status, attachments_json)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            messageId,
            sender?.address || '',
            sender?.name || '',
            parsed.subject || '(无主题)',
            (parsed.text || '').slice(0, 20000),
            parsed.date ? parsed.date.toISOString() : null,
            match?.client_id || null,
            match?.hint || null,
            'pending',
            JSON.stringify(attachments)
          )
          processed++
          console.log(`[inbound] 归档新邮件: "${parsed.subject}" (${attachments.length} 附件)${match ? ` → client ${match.client_id}` : ' → 待人工'}`)
        } catch (e) {
          console.error(`[inbound] 解析 uid=${uid} 失败:`, e.message)
        }
      }
    } finally {
      lock.release()
    }
    await client.logout()
  } catch (e) {
    console.error('[inbound] IMAP 轮询失败:', e.message)
  }

  return { processed, skipped, exists }
}

/** 启动 IMAP 收件调度器（启动即跑一次，之后按 IMAP_POLL_MS 或默认 5 分钟轮询） */
export function startInboundScheduler() {
  if (!isImapConfigured()) {
    console.log('[inbound] IMAP 未配置，收件轮询已停用（待配置 IMAP_HOST/USER/PASS）')
    return
  }
  const pollMs = parseInt(process.env.IMAP_POLL_MS || String(DEFAULT_POLL_MS))
  const run = () => pollInbox().catch(e => console.error('[inbound] 轮询异常:', e.message))
  run()
  setInterval(run, pollMs)
  console.log(`[inbound] IMAP 收件调度器已启动（每 ${Math.round(pollMs / 60000)} 分钟）`)
}
