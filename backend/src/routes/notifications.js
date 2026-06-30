/**
 * FREDDY Notifications API — Client notification inbox
 *
 * Endpoints for clients to fetch, read, and manage notifications
 * created by admin review decisions and admin messages.
 */
import { Router } from 'express'
import { getDb } from '../db.js'
import { authMiddleware } from '../auth.js'

const router = Router()

// GET /api/notifications — client's notifications (newest first, paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const limit = Math.min(50, parseInt(req.query.limit) || 20)
    const offset = parseInt(req.query.offset) || 0
    const rows = await db.all(
      `SELECT * FROM notifications WHERE client_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      req.user.client_id, limit, offset
    )
    res.json({ success: true, data: rows })
  } catch (e) {
    console.error('[notifications] list error:', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/notifications/unread-count — badge number
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const row = await db.get(
      'SELECT COUNT(*) as cnt FROM notifications WHERE client_id = ? AND is_read = 0',
      req.user.client_id
    )
    res.json({ success: true, count: row.cnt })
  } catch (e) {
    console.error('[notifications] unread-count error:', e)
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/notifications/:id/read — mark one notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    await db.run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND client_id = ?',
      req.params.id, req.user.client_id
    )
    res.json({ success: true })
  } catch (e) {
    console.error('[notifications] mark-read error:', e)
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/notifications/read-all — mark all client's notifications as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    await db.run(
      'UPDATE notifications SET is_read = 1 WHERE client_id = ? AND is_read = 0',
      req.user.client_id
    )
    res.json({ success: true })
  } catch (e) {
    console.error('[notifications] read-all error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
