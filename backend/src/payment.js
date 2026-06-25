/**
 * FREDDY EPR Platform - Payment Module
 * Adapted from cbam-platform. ES module version.
 */
import crypto from 'crypto'
import { Router } from 'express'
import { getDb } from './db.js'

const SIMULATION_MODE = !process.env.WECHAT_MCH_ID && !process.env.ALIPAY_APP_ID

const WECHAT = {
  appId: process.env.WECHAT_APP_ID || '',
  mchId: process.env.WECHAT_MCH_ID || '',
  apiV3Key: process.env.WECHAT_API_KEY || '',
  serialNo: process.env.WECHAT_SERIAL_NO || '',
  privateKey: process.env.WECHAT_PRIVATE_KEY || '',
  notifyUrl: (process.env.BASE_URL || 'http://localhost:3002') + '/api/payments/wechat/callback',
}

const ALIPAY = {
  appId: process.env.ALIPAY_APP_ID || '',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  notifyUrl: (process.env.BASE_URL || 'http://localhost:3002') + '/api/payments/alipay/callback',
}

const TIER_FEES_EUR = { basic: 89, standard: 159, premium: 249 }
const EUR_CNY_RATE = 7.8

function genTradeNo() {
  return 'EPR' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase()
}

function eurToCny(eur) { return Math.round(eur * EUR_CNY_RATE * 100) / 100 }

async function createPayment({ clientId, contractId, tier, method }) {
  method = method || 'wechat'
  const db = await getDb()
  const eur = TIER_FEES_EUR[tier] || 89
  const cny = eurToCny(eur)
  const tradeNo = genTradeNo()
  let qr = null, url = null

  if (method === 'wechat') {
    if (SIMULATION_MODE) {
      url = '/api/payments/' + tradeNo + '/qr?method=wechat&amount=' + cny
    } else {
      const r = await createWechatOrder(tradeNo, cny, 'EPR Service')
      qr = r.code_url
    }
  } else if (method === 'alipay') {
    if (SIMULATION_MODE) url = '/api/payments/' + tradeNo + '/qr?method=alipay&amount=' + cny
  } else {
    url = '/api/payments/' + tradeNo + '/qr?method=bank&amount=' + cny
  }

  await db.run(
    "INSERT INTO payments (client_id,contract_id,payment_type,amount_cny,amount_eur,payment_method,out_trade_no,qr_code_url,pay_url,status) VALUES (?,?,'contract_fee',?,?,?,?,?,?,'pending')",
    clientId, contractId, cny, eur, method, tradeNo, qr, url
  )
  return { outTradeNo: tradeNo, cnyAmount: cny, eurAmount: eur, payUrl: url, qrCodeUrl: qr }
}

async function markPaid(tradeNo) {
  const db = await getDb()
  await db.run('BEGIN IMMEDIATE')
  try {
    const p = await db.get('SELECT * FROM payments WHERE out_trade_no = ?', tradeNo)
    if (!p) { await db.run('ROLLBACK'); throw new Error('Not found') }
    if (p.status === 'paid') { await db.run('ROLLBACK'); return p }
    await db.run("UPDATE payments SET status='paid', paid_at=datetime('now') WHERE out_trade_no=?", tradeNo)
    if (p.contract_id) {
      await db.run("UPDATE contracts SET status='active' WHERE id=? AND status='pending_payment'", p.contract_id)
    }
    const existing = await db.get('SELECT id FROM invoices WHERE payment_id = ?', p.id)
    if (!existing) {
      const inv = 'INV-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase()
      await db.run("INSERT INTO invoices (client_id,contract_id,payment_id,invoice_number,amount_eur,status) VALUES (?,?,?,?,?,'issued')", p.client_id, p.contract_id, p.id, inv, p.amount_eur)
    }
    await db.run('COMMIT')
    return p
  } catch (e) {
    await db.run('ROLLBACK')
    throw e
  }
}

async function createWechatOrder(tradeNo, cny, desc) {
  const body = JSON.stringify({
    appid: WECHAT.appId, mchid: WECHAT.mchId, description: desc,
    out_trade_no: tradeNo, notify_url: WECHAT.notifyUrl,
    amount: { total: Math.round(cny * 100), currency: 'CNY' },
  })
  const nonce = crypto.randomBytes(16).toString('hex')
  const ts = Math.floor(Date.now() / 1000)
  const msg = 'POST\n/v3/pay/transactions/native\n' + ts + '\n' + nonce + '\n' + body + '\n'
  const sig = crypto.createSign('RSA-SHA256').update(msg).sign(WECHAT.privateKey, 'base64')
  const auth = 'WECHATPAY2-SHA256-RSA2048 mchid="' + WECHAT.mchId + '",nonce_str="' + nonce + '",signature="' + sig + '",timestamp="' + ts + '",serial_no="' + WECHAT.serialNo + '"'
  const res = await fetch('https://api.mch.weixin.qq.com/v3/pay/transactions/native', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth, Accept: 'application/json' }, body,
  })
  return res.json()
}

const router = Router()

router.get('/:tradeNo/qr', async (req, res) => {
  const db = await getDb()
  const p = await db.get('SELECT * FROM payments WHERE out_trade_no = ?', req.params.tradeNo)
  if (!p) return res.status(404).json({ error: 'Not found' })
  const m = req.query.method || p.payment_method || 'wechat'
  const labels = { wechat: 'WeChat Pay', alipay: 'Alipay', bank: 'Bank Transfer' }
  const simBtn = SIMULATION_MODE ? '<a class="btn" href="/api/payments/simulate/' + p.out_trade_no + '">Simulate Payment</a>' : ''
  const bank = m === 'bank' ? '<p style="color:#666;margin-bottom:16px">Transfer to FREDDY bank account. Ref: ' + p.out_trade_no + '</p>' : ''
  res.send('<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FREDDY Pay</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#f8f9fa;display:flex;justify-content:center;align-items:center;min-height:100vh}.card{background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:400px;width:90%}h2{color:#1e3a5f;margin-bottom:8px}.amount{font-size:36px;font-weight:700;color:#c8a44e;margin:16px 0}.method{color:#666;margin-bottom:24px}.btn{display:inline-block;padding:12px 32px;background:#1e3a5f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:8px}</style></head><body><div class="card"><h2>FREDDY</h2><p>EPR Compliance</p><div class="amount">CNY ' + p.amount_cny + '</div><p class="method">' + (labels[m] || m) + '</p>' + bank + simBtn + '<p style="color:#999;font-size:12px;margin-top:16px">Order: ' + p.out_trade_no + '</p></div></body></html>')
})

router.post('/simulate/:tradeNo', async (req, res) => {
  try { await markPaid(req.params.tradeNo); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/wechat/callback', async (req, res) => {
  try { if (req.body.out_trade_no) await markPaid(req.body.out_trade_no) }
  catch (e) { console.error('[payment] WeChat callback error:', e.message) }
  res.json({ code: 'SUCCESS', message: 'OK' })
})

router.post('/alipay/callback', async (req, res) => {
  try { if (req.body.out_trade_no) await markPaid(req.body.out_trade_no) }
  catch (e) { console.error('[payment] Alipay callback error:', e.message) }
  res.send('success')
})

export { createPayment, markPaid }
export default router
