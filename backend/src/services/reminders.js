/**
 * FREDDY Reminder Service — Automated reporting deadline reminders
 * Run periodically (cron job or manual trigger) to check and send reminders.
 */
import { getDb } from '../db.js'
import { sendReminder } from './email.js'

const REMINDER_WINDOWS = [30, 14, 5] // days before deadline

export async function checkReminders() {
  const db = await getDb()
  const today = new Date().toISOString().slice(0, 10)

  // Check reporting deadlines (Feb 15 each year)
  const currentYear = new Date().getFullYear()
  const deadline = `${currentYear}-02-15`
  const daysLeft = Math.ceil((new Date(deadline) - new Date(today)) / (1000 * 60 * 60 * 24))

  if (REMINDER_WINDOWS.includes(daysLeft)) {
    // Get all active contracts
    const contracts = await db.all(`
      SELECT c.*, cl.contact_email, cl.contact_name FROM contracts c
      JOIN clients cl ON c.client_id = cl.id
      WHERE c.status = 'active' AND c.lucid_confirmed = 1
    `)

    for (const c of contracts) {
      // Check if already sent for this window
      const existing = await db.get(
        "SELECT id FROM reminders WHERE contract_id = ? AND reminder_type = 'reporting' AND due_date = ? AND status = 'sent'",
        c.id, deadline
      )
      if (existing) continue

      await sendReminder({ email: c.contact_email, name: c.contact_name, contractNumber: c.contract_number, daysLeft, type: 'reporting' })
      await db.run(
        "INSERT INTO reminders (contract_id, reminder_type, due_date, status, sent_at) VALUES (?, 'reporting', ?, 'sent', datetime('now'))",
        c.id, deadline
      )
      console.log(`[reminders] Sent ${daysLeft}-day reminder to ${c.contact_email}`)
    }
  }

  // Check contract expiry (30 days before end)
  const expiringContracts = await db.all(`
    SELECT c.*, cl.contact_email, cl.contact_name FROM contracts c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.status = 'active' AND date(c.end_date) <= date('now', '+30 days')
  `)

  for (const c of expiringContracts) {
    const daysToExpiry = Math.ceil((new Date(c.end_date) - new Date(today)) / (1000 * 60 * 60 * 24))
    if (!REMINDER_WINDOWS.includes(daysToExpiry)) continue

    const existing = await db.get(
      "SELECT id FROM reminders WHERE contract_id = ? AND reminder_type = 'expiry' AND due_date = ? AND status = 'sent'",
      c.id, c.end_date
    )
    if (existing) continue

    await sendReminder({ email: c.contact_email, name: c.contact_name, contractNumber: c.contract_number, daysLeft: daysToExpiry, type: 'expiry' })
    await db.run(
      "INSERT INTO reminders (contract_id, reminder_type, due_date, status, sent_at) VALUES (?, 'expiry', ?, 'sent', datetime('now'))",
      c.id, c.end_date
    )
  }

  console.log(`[reminders] Check complete — ${today}`)
}
