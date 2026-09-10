import { Router } from 'express'
import multer from 'multer'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getDb } from '../db.js'
import { authMiddleware } from '../auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootPath = join(__dirname, '..', '..', '..')
export const uploadsDir = join(rootPath, 'uploads')

if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })

/** 删除物理文件（若存在）；供客户/管理员删除接口复用 */
export function unlinkUploadFile(storedPath) {
  if (!storedPath) return
  try {
    const fp = join(uploadsDir, storedPath)
    if (existsSync(fp)) unlinkSync(fp)
  } catch (e) {
    console.error('[uploads] unlink failed:', e.message)
  }
}

/** Decode Latin-1 misinterpreted UTF-8 filenames (Windows multer bug) */
function fixEncoding(name) {
  try { return Buffer.from(name, 'latin1').toString('utf8') } catch { return name }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const decoded = fixEncoding(file.originalname)
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${decoded.replace(/[^a-zA-Z0-9._\-一-鿿㐀-䶿()（）]/g, '_')}`
    cb(null, safeName)
  },
})
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }) // 100MB

const router = Router()

// POST /api/uploads — Upload a file (signed contract, evidence, etc.)
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' })

    const db = await getDb()
    const { contract_id, file_type } = req.body

    const result = await db.run(
      `INSERT INTO uploads (client_id, contract_id, file_type, original_name, stored_path, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      req.user.client_id,
      contract_id || null,
      file_type || 'other',
      fixEncoding(req.file.originalname),
      req.file.filename,
      req.file.size,
      req.file.mimetype
    )

    // If client uploaded signed contract, mark contract as signed
    if (file_type === 'signed_contract' && contract_id) {
      await db.run("UPDATE contracts SET signed_at = datetime('now') WHERE id = ? AND signed_at IS NULL", contract_id)
    }

    // 自动覆盖：同 contract_id + file_type 的旧「待审核」凭证，重新上传即替换（只删 pending，不碰 approved/rejected）
    const replaceable = file_type && (file_type.startsWith('proof_') || file_type === 'bank_proof')
    if (replaceable && contract_id) {
      const oldRows = await db.all(
        "SELECT id, stored_path FROM uploads WHERE client_id = ? AND contract_id = ? AND file_type = ? AND status = 'pending' AND id != ?",
        req.user.client_id, contract_id, file_type, result.lastID
      )
      for (const o of oldRows) {
        await db.run('DELETE FROM uploads WHERE id = ?', o.id)
        unlinkUploadFile(o.stored_path)
      }
    }

    // 返回完整记录（含 id/contract_id/file_type/status），前端上传后能立即展示「已上传 + 下载」
    res.status(201).json({
      success: true,
      file: {
        id: result.lastID,
        client_id: req.user.client_id,
        contract_id: contract_id ? Number(contract_id) : null,
        file_type: file_type || 'other',
        original_name: fixEncoding(req.file.originalname),
        stored_path: req.file.filename,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        status: 'pending',
        uploaded_at: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.error('[uploads] error:', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/uploads — List user's uploaded files
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const files = await db.all(
      'SELECT * FROM uploads WHERE client_id = ? ORDER BY uploaded_at DESC',
      req.user.client_id
    )
    res.json({ success: true, data: files })
  } catch (e) {
    console.error('[uploads] list error:', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/uploads/:id/download — Download a file
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const file = await db.get('SELECT * FROM uploads WHERE id = ?', req.params.id)
    if (!file) return res.status(404).json({ error: 'File not found' })
    // Client can only download their own files
    if (req.user.role !== 'admin' && file.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const filePath = join(uploadsDir, file.stored_path)
    if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' })
    res.download(filePath, file.original_name)
  } catch (e) {
    console.error('[uploads] download error:', e)
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/uploads/:id — 客户删除自己上传的凭证（仅限待审核）
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb()
    const file = await db.get('SELECT * FROM uploads WHERE id = ?', req.params.id)
    if (!file) return res.status(404).json({ error: 'File not found' })
    if (file.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (file.status !== 'pending') {
      return res.status(400).json({ error: '已审核的凭证不可删除，请联系管理员' })
    }
    await db.run('DELETE FROM uploads WHERE id = ?', req.params.id)
    unlinkUploadFile(file.stored_path)
    res.json({ success: true })
  } catch (e) {
    console.error('[uploads] delete error:', e)
    res.status(500).json({ error: e.message })
  }
})

export default router
