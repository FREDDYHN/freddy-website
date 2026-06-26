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
        SELECT c.*, cl.contact_email, cl.contact_name FROM contracts c
        JOIN clients cl ON c.client_id = cl.id
        WHERE c.status = 'active' AND c.lucid_confirmed = 1
      `)

      for (const c of contracts) {
        // Check if already sent for this specific window
        const existing = await db.get(
          "SELECT id FROM reminders WHERE contract_id = ? AND reminder_type = 'reporting' AND due_date = ? AND status = 'sent'",
          c.id, deadline
        )
        if (existing) continue

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
      }
      break  // Only send for the largest matching window (skip smaller windows)
    }
  }

  // ── Contract expiry check ──
  const expiringContracts = await db.all(`
    SELECT c.*, cl.contact_email, cl.contact_name FROM contracts c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.status = 'active' AND date(c.end_date) <= date('now', '+30 days')
  `)

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

    const existing = await db.get(
      "SELECT id FROM reminders WHERE contract_id = ? AND reminder_type = 'expiry' AND due_date = ? AND status = 'sent'",
      c.id, c.end_date
    )
    if (existing) continue

    try {
      await sendReminder({ email: c.contact_email, name: c.contact_name, contractNumber: c.contract_number, daysLeft: daysToExpiry, type: 'expiry' })
      await db.run(
        "INSERT INTO reminders (contract_id, reminder_type, due_date, status, sent_at) VALUES (?, 'expiry', ?, 'sent', datetime('now'))",
        c.id, c.end_date
      )
      console.log(`[reminders] Sent ${daysToExpiry}-day expiry reminder to ${c.contact_email} (contract ${c.contract_number})`)
    } catch (e) {
      console.error(`[reminders] FAILED to send expiry reminder to ${c.contact_email}:`, e.message)
    }
  }

  console.log(`[reminders] Check complete — ${todayStr}`)
}
