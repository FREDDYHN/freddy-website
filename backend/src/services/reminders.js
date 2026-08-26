/**
 * FREDDY Reminder Service — Automated reporting deadline reminders
 *
 * Run periodically (cron or manual trigger from Admin panel) to check and send reminders.
 *
 * IMPROVEMENT: Uses RANGE-based checking instead of exact-day matching,
 * so reminders are never missed if the cron job skips a day.
 */
import { getDb } from '../db.js'
import { sendReminder } from './email.js'
import { REMINDER_WINDOWS, REPORTING_DEADLINE_MONTH, REPORTING_DEADLINE_DAY } from '../../../shared/constants.js'

/** Days before deadline to send reminders (30, 14, 5) */
const WINDOWS = REMINDER_WINDOWS

/** 邮件发送并发上限：避免批量提醒时串行太慢 / 并发太高打爆 SMTP */
const SEND_CONCURRENCY = 5

/** 有界并发 map：最多 `limit` 个任务同时进行，单个失败不影响其它 */
async function pMap(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      try { results[i] = await fn(items[i], i) }
      catch (e) { results[i] = { __error: e } }
    }
  })
  await Promise.all(workers)
  return results
}

export async function checkReminders() {
  const db = await getDb()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // ── Reporting deadline check ──
  // Deadline: February 15 each year
  const currentYear = today.getFullYear()
  // If today is after Feb 15, the next deadline is next year's Feb 15
  const deadlineYear = (today.getMonth() + 1 > REPORTING_DEADLINE_MONTH ||
    (today.getMonth() + 1 === REPORTING_DEADLINE_MONTH && today.getDate() > REPORTING_DEADLINE_DAY))
    ? currentYear + 1 : currentYear
  const deadline = `${deadlineYear}-${String(REPORTING_DEADLINE_MONTH).padStart(2,'0')}-${String(REPORTING_DEADLINE_DAY).padStart(2,'0')}`
  const daysLeft = Math.ceil((new Date(deadline) - today) / (1000 * 60 * 60 * 24))

  // Send if we are within any of the reminder windows AND haven't already sent for this window
  for (const windowDays of WINDOWS) {
    if (daysLeft <= windowDays && daysLeft > 0) {
      const contracts = await db.all(`
        SELECT c.id, c.contract_number, cl.contact_email, cl.contact_name FROM contracts c
        JOIN clients cl ON c.client_id = cl.id
        WHERE c.status = 'active' AND c.lucid_confirmed = 1
      `)

      // 一次批量取出该窗口已发送的合同，避免逐条 N+1 查询
      const alreadySent = await db.all(
        "SELECT contract_id FROM reminders WHERE reminder_type = 'reporting' AND due_date = ? AND status = 'sent'",
        deadline
      )
      const sentSet = new Set(alreadySent.map(r => r.contract_id))
      const toSend = contracts.filter(c => !sentSet.has(c.id))

      await pMap(toSend, SEND_CONCURRENCY, async (c) => {
        try {
          await sendReminder({ email: c.contact_email, name: c.contact_name, contractNumber: c.contract_number, daysLeft, type: 'reporting' })
          await db.run(
            "INSERT INTO reminders (contract_id, reminder_type, due_date, status, sent_at) VALUES (?, 'reporting', ?, 'sent', datetime('now'))",
            c.id, deadline
          )
          console.log(`[reminders] Sent ${daysLeft}-day reporting reminder to ${c.contact_email} (contract ${c.contract_number})`)
        } catch (e) {
          console.error(`[reminders] FAILED to send reporting reminder to ${c.contact_email}:`, e.message)
        }
      })
      break  // Only send for the largest matching window (skip smaller windows)
    }
  }

  // ── Contract expiry check ──
  const expiringContracts = await db.all(`
    SELECT c.id, c.contract_number, c.end_date, cl.contact_email, cl.contact_name FROM contracts c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.status = 'active' AND date(c.end_date) <= date('now', '+30 days')
  `)

  // 一次批量取出已发送的到期提醒，避免逐条 N+1 查询
  const expIds = expiringContracts.map(c => c.id)
  const alreadyExpSent = expIds.length > 0
    ? await db.all(
        `SELECT contract_id, due_date FROM reminders WHERE reminder_type = 'expiry' AND status = 'sent' AND contract_id IN (${expIds.map(() => '?').join(',')})`,
        ...expIds
      )
    : []
  const expSentSet = new Set(alreadyExpSent.map(r => `${r.contract_id}:${r.due_date}`))

  const toSendExpiry = []
  for (const c of expiringContracts) {
    const daysToExpiry = Math.ceil((new Date(c.end_date) - today) / (1000 * 60 * 60 * 24))

    // Find the largest window that covers this daysToExpiry
    let applicableWindow = null
    for (const w of WINDOWS) {
      if (daysToExpiry <= w && daysToExpiry > 0) {
        applicableWindow = w
        break
      }
    }
    if (!applicableWindow) continue
    if (expSentSet.has(`${c.id}:${c.end_date}`)) continue
    toSendExpiry.push({ ...c, daysToExpiry })
  }

  await pMap(toSendExpiry, SEND_CONCURRENCY, async (c) => {
    try {
      await sendReminder({ email: c.contact_email, name: c.contact_name, contractNumber: c.contract_number, daysLeft: c.daysToExpiry, type: 'expiry' })
      await db.run(
        "INSERT INTO reminders (contract_id, reminder_type, due_date, status, sent_at) VALUES (?, 'expiry', ?, 'sent', datetime('now'))",
        c.id, c.end_date
      )
      console.log(`[reminders] Sent ${c.daysToExpiry}-day expiry reminder to ${c.contact_email} (contract ${c.contract_number})`)
    } catch (e) {
      console.error(`[reminders] FAILED to send expiry reminder to ${c.contact_email}:`, e.message)
    }
  })

  console.log(`[reminders] Check complete — ${todayStr}`)
}

/**
 * Start the scheduled reminder checker.
 * Runs once on startup, then every 6 hours — so reporting/expiry reminders
 * are never missed if no admin manually clicks the "check" button.
 */
export function startReminderScheduler() {
  const run = () => {
    checkReminders().catch((e) => {
      console.error('[reminders] Scheduled check failed:', e.message)
    })
  }

  run() // once at startup

  setInterval(run, 6 * 60 * 60 * 1000)

  console.log('[reminders] Auto-scheduler started (every 6 hours)')
}
