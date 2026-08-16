/**
 * LUCID 密码可逆加密工具
 *
 * 授权代表将来要代替客户登录 LUCID 申报，因此 LUCID 密码必须能解密还原使用，
 * 不能用 bcrypt 单向哈希。这里用 Node 内置 crypto 的 aes-256-gcm。
 *
 * 密钥来源：环境变量 LUCID_ENCRYPTION_KEY（64 hex = 32 字节），无则回退 JWT_SECRET。
 * 统一用 SHA-256 派生为固定 32 字节密钥，避免输入长度不规范的边界问题。
 *
 * 存储格式（单字段）：`iv_base64:authTag_base64:ciphertext_base64`
 */
import crypto from 'crypto'
import { JWT_SECRET } from '../auth.js'

const KEY = crypto.createHash('sha256').update(process.env.LUCID_ENCRYPTION_KEY || JWT_SECRET).digest()

/** 加密明文 → "iv:tag:ciphertext"（base64） */
export function encryptLucid(plain) {
  if (!plain) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':')
}

/** 解密 "iv:tag:ciphertext" → 明文；失败返回空串 */
export function decryptLucid(stored) {
  if (!stored) return ''
  try {
    const [ivB64, tagB64, dataB64] = stored.split(':')
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
    return dec.toString('utf8')
  } catch (e) {
    console.error('[crypto] decryptLucid failed:', e.message)
    return ''
  }
}
