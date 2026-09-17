/**
 * FREDDY Cleanup Service — 自动清理废弃账号
 *
 * Rule 1：收到验证邮件后 1 周未验证邮箱 → 删除
 * Rule 2：验证完成后 1 周未缴纳授权代表年费 → 删除
 *
 * 软删除：7 天到期仅标记（管理员页隐藏）+ 释放邮箱/手机号唯一约束，业务数据保留 3 个月后再硬删除。
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

/** 软删除单个客户：仅标记 + 释放邮箱/手机号唯一约束，业务数据保留 3 个月后由硬删除清掉 */
async function softDeleteClient(db, clientId) {
  await db.run(
    `UPDATE clients SET
       deleted_at = datetime('now'), status = 'deleted',
       deleted_email = contact_email, deleted_phone = contact_phone,
       contact_email = 'deleted-' || id || '@deleted.local',
       contact_phone = NULL, contact_phone_unique = NULL
     WHERE id = ?`, clientId
  )
  // 登录邮箱同样改占位符释放（否则同名邮箱重注册后 login 会查到两条）
  await db.run(`UPDATE users SET email = 'deleted-' || id || '@deleted.local' WHERE client_id = ?`, clientId)
}

/** 硬删除软删超过 3 个月的客户 */
export async function purgeDeletedAccounts() {
  const db = await getDb()
  const rows = await db.all(
    "SELECT id FROM clients WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-3 months')"
  )
  if (rows.length === 0) return 0
  for (const r of rows) {
    await deleteClientCascade(db, r.id)
    console.log(`[cleanup] 已硬删除（软删超3个月） #${r.id}`)
  }
  return rows.length
}

/** 执行一轮清理，返回删除的客户数 */
export async function cleanupAbandonedAccounts() {
  const db = await getDb()
  const grace = `-${GRACE_DAYS} days`

  // Rule 1：收到验证邮件（= 申请合同）1 周未验证
  const rule1 = await db.all(
    `SELECT DISTINCT u.client_id FROM users u
     JOIN contracts c ON c.client_id = u.client_id
     JOIN clients cl ON cl.id = u.client_id
     WHERE u.email_verified = 0 AND c.status = 'pending_verification'
       AND cl.deleted_at IS NULL
       AND u.created_at < datetime('now', ?)`,
    grace
  )
  // Rule 2：验证完成 1 周未缴年费（无 contract_fee 已付记录）
  const rule2 = await db.all(
    `SELECT DISTINCT u.client_id FROM users u
     JOIN clients cl ON cl.id = u.client_id
     WHERE u.email_verified = 1 AND u.email_verified_at IS NOT NULL
       AND cl.deleted_at IS NULL
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
    await softDeleteClient(db, clientId)
    console.log(`[cleanup] 已软删除 #${clientId} ${info?.contact_email || ''}（${info?.company_name || ''}）`)
    deleted++
  }
  console.log(`[cleanup] 本轮软删除 ${deleted} 个废弃账号（未验证 ${rule1.length}，未付款 ${rule2.length}）`)
  return deleted
}

/** 启动定时清理：启动时跑一次 + 每 24 小时（先软删废弃账号，再硬删软删超 3 个月的） */
export function startCleanupScheduler() {
  const run = () => {
    cleanupAbandonedAccounts()
      .then(() => purgeDeletedAccounts())
      .catch(e => {
        console.error('[cleanup] 定时清理失败:', e.message)
      })
  }
  run()
  setInterval(run, 24 * 60 * 60 * 1000)
  console.log('[cleanup] 自动清理已启动（每 24 小时 + 启动时一次）')
}
