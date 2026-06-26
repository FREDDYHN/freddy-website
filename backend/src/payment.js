/**
 * FREDDY EPR Platform - Payment Module
 *
 * Supports: WeChat Pay V3, Alipay, Bank Transfer.
 * Callback endpoints VERIFY signatures before processing.
 * Simulation endpoints are only available when SIMULATION_MODE is active.
 */
import crypto from 'crypto'
import { Router } from 'express'
import { getDb } from './db.js'
import { authMiddleware, adminMiddleware } from './auth.js'
import { AR_TIER_FEES_EUR, EUR_CNY_RATE } from '../../shared/constants.js'

const SIMULATION_MODE = !process.env.WECHAT_MCH_ID && !process.env.ALIPAY_APP_ID

const WECHAT = {
  appId:      process.env.WECHAT_APP_ID      || '',
  mchId:      process.env.WECHAT_MCH_ID      || '',
  apiV3Key:   process.env.WECHAT_API_KEY     || '',
  serialNo:   process.env.WECHAT_SERIAL_NO   || '',
  privateKey: process.env.WECHAT_PRIVATE_KEY || '',
  publicKey:  process.env.WECHAT_PUBLIC_KEY  || '',  // For callback signature verification
  notifyUrl:  (process.env.BASE_URL || 'http://localhost:3002') + '/api/payments/wechat/callback',
}

const ALIPAY = {
  appId:          process.env.ALIPAY_APP_ID          || '',
  privateKey:     process.env.ALIPAY_PRIVATE_KEY     || '',
  alipayPublicKey:process.env.ALIPAY_PUBLIC_KEY      || '',
  notifyUrl:      (process.env.BASE_URL || 'http://localhost:3002') + '/api/payments/alipay/callback',
}

function genTradeNo() {
  return 'EPR' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase()
}

function eurToCny(eur) { return Math.round(eur * EUR_CNY_RATE * 100) / 100 }

// ══════════════════════════════════════════════
//  Signature Verification Helpers
// ══════════════════════════════════════════════

/**
 * Verify WeChat Pay V3 callback signature.
 *
 * WeChat signs the response with: timestamp\nnonce\nbody\n
 * The signature is sent in the Wechatpay-Signature header.
 */
function verifyWechatSignature(timestamp, nonce, body, signature) {
  if (!WECHAT.publicKey) {
    if (!SIMULATION_MODE) {
      console.error('[payment] FATAL: WECHAT_PUBLIC_KEY required in production mode')
      return false
    }
    console.warn('[payment] WECHAT_PUBLIC_KEY not set — skipping verification (dev only)')
    return true
  }
  try {
    const message = `${timestamp}\n${nonce}\n${body}\n`
    const verify = crypto.createVerify('RSA-SHA256')
    verify.update(message)
    return verify.verify(WECHAT.publicKey, signature, 'base64')
  } catch (e) {
    console.error('[payment] WeChat signature verification error:', e.message)
    return false
  }
}

/**
 * Verify Alipay callback signature.
 * Alipay signs sorted parameters (excluding sign and sign_type) with RSA-SHA256.
 */
function verifyAlipaySignature(params) {
  if (!ALIPAY.alipayPublicKey) {
    if (!SIMULATION_MODE) {
      console.error('[payment] FATAL: ALIPAY_PUBLIC_KEY required in production mode')
      return false
    }
    console.warn('[payment] ALIPAY_PUBLIC_KEY not set — skipping verification (dev only)')
    return true
  }
  try {
    const sign = params.sign
    const signType = params.sign_type || 'RSA2'
    // Sort keys alphabetically, exclude sign and sign_type
    const sortedKeys = Object.keys(params)
      .filter(k => k !== 'sign' && k !== 'sign_type')
      .sort()
    const content = sortedKeys.map(k => `${k}=${params[k]}`).join('&')
    const verify = crypto.createVerify(signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1')
    verify.update(content)
    return verify.verify(ALIPAY.alipayPublicKey, sign, 'base64')
  } catch (e) {
    console.error('[payment] Alipay signature verification error:', e.message)
    return false
  }
}

// ══════════════════════════════════════════════
//  Core Payment Logic
// ══════════════════════════════════════════════

async function createPayment({ clientId, contractId, tier, method }) {
  method = method || 'wechat'
  const db = await getDb()
  const eur = AR_TIER_FEES_EUR[tier] || 89
  const cny = eurToCny(eur)
  const tradeNo = genTradeNo()
  let qr = null, url = null

  if (method === 'wechat') {
    if (SIMULATION_MODE) {
      url = '/api/payments/' + tradeNo + '/qr?method=wechat&amount=' + cny
    } else {
      try {
        const r = await createWechatOrder(tradeNo, cny, 'EPR Service')
        qr = r.code_url
      } catch (e) {
        console.error('[payment] WeChat order creation failed:', e.message)
        throw new Error('Payment gateway unavailable')
      }
    }
  } else if (method === 'alipay') {
    if (SIMULATION_MODE) {
      url = '/api/payments/' + tradeNo + '/qr?method=alipay&amount=' + cny
    } else {
      try {
        const r = await createAlipayOrder(tradeNo, cny, 'EPR Service')
        qr = r.qr_code
      } catch (e) {
        console.error('[payment] Alipay order creation failed:', e.message)
        throw new Error('Payment gateway unavailable')
      }
    }
  } else {
    // Bank transfer
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
    if (!p) { await db.run('ROLLBACK'); throw new Error('Payment not found') }
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
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`WeChat API error ${res.status}: ${errBody}`)
  }
  return res.json()
}

async function createAlipayOrder(tradeNo, cny, desc) {
  // Alipay page pay (simplified — full implementation needs Alipay SDK or manual signing)
  const params = {
    app_id: ALIPAY.appId,
    method: 'alipay.trade.page.pay',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00'),
    version: '1.0',
    notify_url: ALIPAY.notifyUrl,
    biz_content: JSON.stringify({
      out_trade_no: tradeNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: (cny / EUR_CNY_RATE).toFixed(2),
      subject: desc,
    }),
  }
  // Build signed URL
  const sortedKeys = Object.keys(params).sort()
  const content = sortedKeys.map(k => `${k}=${params[k]}`).join('&')
  const sign = crypto.createSign('RSA-SHA256').update(content).sign(ALIPAY.privateKey, 'base64')
  const query = sortedKeys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&') + '&sign=' + encodeURIComponent(sign)
  const url = 'https://openapi.alipay.com/gateway.do?' + query
  // Return the URL — frontend redirects user to Alipay
  return { qr_code: url }
}

// ══════════════════════════════════════════════
//  Routes
// ══════════════════════════════════════════════

const router = Router()

// GET /api/payments/:tradeNo/qr — Payment page (public)
router.get('/:tradeNo/qr', async (req, res) => {
  try {
    const db = await getDb()
    const p = await db.get('SELECT * FROM payments WHERE out_trade_no = ?', req.params.tradeNo)
    if (!p) return res.status(404).json({ error: 'Payment not found' })
    const m = req.query.method || p.payment_method || 'wechat'
    const labels = { wechat: 'WeChat Pay', alipay: 'Alipay', bank: 'Bank Transfer' }
    const simBtn = SIMULATION_MODE
      ? '<a class="btn" href="/api/payments/simulate/' + p.out_trade_no + '" style="background:#f59e0b">⚠️ Simulate Payment (Dev Only)</a>'
      : ''
    const bank = m === 'bank'
      ? '<p style="color:#666;margin-bottom:16px">请转账至 FREDDY 对公账户。附言/备注: ' + p.out_trade_no + '</p><p style="color:#999;font-size:12px">对公账户信息请联系客服获取。</p>'
      : ''
    res.send('<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FREDDY Pay</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#f8f9fa;display:flex;justify-content:center;align-items:center;min-height:100vh}.card{background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:400px;width:90%}h2{color:#1e3a5f;margin-bottom:8px}.amount{font-size:36px;font-weight:700;color:#c8a44e;margin:16px 0}.method{color:#666;margin-bottom:24px}.btn{display:inline-block;padding:12px 32px;background:#1e3a5f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:8px}</style></head><body><div class="card"><h2>FREDDY</h2><p>EPR Compliance</p><div class="amount">CNY ' + p.amount_cny + '</div><p class="method">' + (labels[m] || m) + '</p>' + bank + simBtn + '<p style="color:#999;font-size:12px;margin-top:16px">Order: ' + p.out_trade_no + '</p></div></body></html>')
  } catch (e) {
    console.error('[payment] QR page error:', e)
    res.status(500).send('Server error')
  }
})

// POST /api/payments/simulate/:tradeNo — ADMIN ONLY (dev tool)
// Only available in SIMULATION_MODE; requires admin auth even in dev
router.post('/simulate/:tradeNo', authMiddleware, adminMiddleware, async (req, res) => {
  if (!SIMULATION_MODE) {
    return res.status(404).json({ error: 'Not found' })
  }
  try {
    await markPaid(req.params.tradeNo)
    console.log(`[payment] SIMULATED payment: ${req.params.tradeNo} (by admin ${req.user?.email})`)
    res.json({ success: true, simulated: true })
  } catch (e) {
    console.error('[payment] Simulation error:', e)
    res.status(500).json({ error: e.message })
  }
})

// POST /api/payments/wechat/callback — WeChat Pay V3 callback
router.post('/wechat/callback', async (req, res) => {
  try {
    const signature = req.headers['wechatpay-signature']
    const timestamp = req.headers['wechatpay-timestamp']
    const nonce = req.headers['wechatpay-nonce']
    const serial = req.headers['wechatpay-serial']
    const body = JSON.stringify(req.body)

    // Verify signature
    if (!signature || !timestamp || !nonce) {
      console.error('[payment] WeChat callback missing headers')
      return res.status(400).json({ code: 'FAIL', message: 'Missing signature headers' })
    }

    if (!verifyWechatSignature(timestamp, nonce, body, signature)) {
      console.error('[payment] WeChat callback signature verification FAILED')
      return res.status(401).json({ code: 'FAIL', message: 'Invalid signature' })
    }

    // Process the payment
    if (req.body.out_trade_no) {
      await markPaid(req.body.out_trade_no)
      console.log(`[payment] WeChat callback processed: ${req.body.out_trade_no}`)
    }
  } catch (e) {
    console.error('[payment] WeChat callback error:', e.message)
  }
  // Always respond SUCCESS to WeChat (prevents repeated callbacks)
  res.json({ code: 'SUCCESS', message: 'OK' })
})

// POST /api/payments/alipay/callback — Alipay callback
router.post('/alipay/callback', async (req, res) => {
  try {
    // Verify Alipay signature
    if (!verifyAlipaySignature(req.body)) {
      console.error('[payment] Alipay callback signature verification FAILED')
      return res.send('fail')
    }

    // Check trade status
    if (req.body.trade_status === 'TRADE_SUCCESS' || req.body.trade_status === 'TRADE_FINISHED') {
      if (req.body.out_trade_no) {
        await markPaid(req.body.out_trade_no)
        console.log(`[payment] Alipay callback processed: ${req.body.out_trade_no}`)
      }
    }
  } catch (e) {
    console.error('[payment] Alipay callback error:', e.message)
  }
  res.send('success')
})

export { createPayment, markPaid }
export default router
