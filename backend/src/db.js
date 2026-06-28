import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import bcryptjs from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', '..', 'database', 'data.db')
const SCHEMA_PATH = join(__dirname, '..', '..', 'database', 'schema.sql')

let db = null

export async function getDb() {
  if (db) return db

  // Ensure database directory exists
  const dbDir = dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  })

  await db.exec('PRAGMA journal_mode = WAL')
  await db.exec('PRAGMA foreign_keys = ON')
  await db.exec('PRAGMA wal_autocheckpoint = 1000')

  // Initialize schema
  if (fs.existsSync(SCHEMA_PATH)) {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
    await db.exec(schema)
  }

  // Auto-run migrations
  const migrationsDir = join(dirname(SCHEMA_PATH), 'migrations')
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      const sql = fs.readFileSync(join(migrationsDir, file), 'utf-8')
      try { await db.exec(sql); console.log(`[db] Migration: ${file}`) }
      catch (e) { if (!e.message.includes('duplicate column')) console.warn(`[db] Migration skip (${file}): ${e.message}`) }
    }
  }

  console.log(`[db] Connected: ${DB_PATH}`)
  return db
}

export async function closeDb() {
  if (db) {
    await db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
    await db.close()
    db = null
    console.log('[db] Closed')
  }
}

export async function seedAdmin() {
  const d = await getDb()
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@freddy.cn'
  const adminPass = process.env.ADMIN_PASS || 'freddy2026'

  const existing = await d.get('SELECT id FROM users WHERE email = ?', adminEmail)
  if (!existing) {
    const hash = await bcryptjs.hash(adminPass, 10)
    await d.run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', adminEmail, hash, 'admin')
    console.log(`[db] Admin user seeded: ${adminEmail}`)
  }
}
