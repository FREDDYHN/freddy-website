import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import { getDb } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET required in production') })() : crypto.randomBytes(32).toString('hex'))
const router = Router()

// ─── Register ───
router.post('/register', async (req, res) => {
  try {
    const { email, password, company_name, contact_name } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const db = await getDb()
    const existing = await db.get('SELECT id FROM users WHERE email = ?', email)
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const hash = await bcryptjs.hash(password, 10)
    const result = await db.run(
      'INSERT INTO clients (company_name, contact_name, contact_email) VALUES (?, ?, ?)',
      company_name || '', contact_name || '', email
    )
    await db.run(
      'INSERT INTO users (email, password_hash, role, client_id) VALUES (?, ?, ?, ?)',
      email, hash, 'client', result.lastID
    )

    res.status(201).json({ client_id: result.lastID, email })
  } catch (e) {
    console.error('[auth] register error:', e)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// ─── Login ───
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const db = await getDb()
    const user = await db.get('SELECT * FROM users WHERE email = ?', email)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcryptjs.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, client_id: user.client_id }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, client_id: user.client_id } })
  } catch (e) {
    res.status(500).json({ error: 'Login failed' })
  }
})

// ─── Role Middleware ───
export function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET)
    next()
  } catch { res.status(401).json({ error: 'Invalid token' }) }
}

export default router
