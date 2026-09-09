/**
 * FREDDY Cleanup Service — 自动清理废弃账号
 *
 * Rule 1：收到验证邮件后 1 周未验证邮箱 → 删除
 * Rule 2：验证完成后 1 周未缴纳授权代表年费 → 删除
 *
 * 硬删除：完整删除客户及其全部关联数据，释放邮箱/手机号唯一约束，使其可再次注册。
 */
import { getDb, withTransaction } from '../db.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { unlinkSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootPath = join(__dirname, '..', '..', '..')
const uploadsDir = join(rootPath, 'uploads')

/** 宽限期（天） */
const GRACE_DAYS = 7

/** 级联硬删除单个客户及其全部关联数据，返回被删的上传文件数 */
async function deleteClientCascade(db, clientId) {
  // 先取上传文件路径（事务提交后再删物理文件）
  const uploads = await db.all('SELECT stored_path FROM uploads WHERE client_id = ?', clientId)

  await withTransaction(db, async () => {
    await db.run('DELETE FROM payments WHERE client_id = ?', clientId)
    await db.run('DELETE FROM invoices WHERE client_id = ?', clientId)
    await db.run('DELETE FROM uploads WHERE client_id = ?', clientId)
    await db.run('DELETE FROM notifications WHERE client_id = ?', clientId)
    await db.run('DELETE FROM applications WHERE client_id = ?', clientId)
    // 外部邮件归档仅解除关联，保留
    await db.run('UPDATE inbound_documents SET client_id = NULL WHERE client_id = ?', clientId)
    await db.run('DELETE FROM reminders WHERE contract_id IN (SELECT id FROM contracts WHERE client_id = ?)', clientId)
    await db.run('DELETE FROM packaging_data WHERE contract_id IN (SELECT id FROM contracts WHERE client_id = ?)', clientId)
    await db.run('DELETE FROM contracts WHERE client_id = ?', clientId)
    await db.run('DELETE FROM users WHERE client_id = ?', clientId)
    await db.run('DELETE FROM clients WHERE id = ?', clientId)
  })

  // 删除物理文件（尽力而为，失败不影响）
  for (const u of uploads) {
    if (!u.stored_path) continue
    try { unlinkSync(join(uploadsDir, u.stored_path)) } catch (_) {}
  }
  return uploads.length
}

/** 执行一轮清理，返回删除的客户数 */
export async function cleanupAbandonedAccounts() {
  const db = await getDb()
  const grace = `-${GRACE_DAYS} days`

  // Rule 1：收到验证邮件（= 申请合同）1 周未验证
  const rule1 = await db.all(
    `SELECT DISTINCT u.client_id FROM users u
     JOIN contracts c ON c.client_id = u.client_id
     WHERE u.email_verified = 0 AND c.status = 'pending_verification'
       AND u.created_at < datetime('now', ?)`,
    grace
  )
  // Rule 2：验证完成 1 周未缴年费（无 contract_fee 已付记录）
  const rule2 = await db.all(
    `SELECT DISTINCT u.client_id FROM users u
     WHERE u.email_verified = 1 AND u.email_verified_at IS NOT NULL
       AND u.email_verified_at < datetime('now', ?)
       AND NOT EXISTS (
         SELECT 1 FROM payments p WHERE p.client_id = u.client_id
           AND p.payment_type = 'contract_fee' AND p.status = 'paid'
       )`,
    grace
  )

  const ids = new Set()
  rule1.forEach(r => ids.add(r.client_id))
  rule2.forEach(r => ids.add(r.client_id))

  if (ids.size === 0) {
    console.log('[cleanup] 无超期废弃账号')
    return 0
  }

  let deleted = 0
  for (const clientId of ids) {
    const info = await db.get('SELECT company_name, contact_email FROM clients WHERE id = ?', clientId)
    await deleteClientCascade(db, clientId)
    console.log(`[cleanup] 已删除 #${clientId} ${info?.contact_email || ''}（${info?.company_name || ''}）`)
    deleted++
  }
  console.log(`[cleanup] 本轮清理 ${deleted} 个废弃账号（未验证 ${rule1.length}，未付款 ${rule2.length}）`)
  return deleted
}

/** 启动定时清理：启动时跑一次 + 每 24 小时 */
export function startCleanupScheduler() {
  const run = () => {
    cleanupAbandonedAccounts().catch(e => {
      console.error('[cleanup] 定时清理失败:', e.message)
    })
  }
  run()
  setInterval(run, 24 * 60 * 60 * 1000)
  console.log('[cleanup] 自动清理已启动（每 24 小时 + 启动时一次）')
}
