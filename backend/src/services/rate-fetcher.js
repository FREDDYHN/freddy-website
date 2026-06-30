/**
 * EUR/CNY Rate Fetcher
 *
 * Primary:  Bank of China 现汇卖出价 (FREDDY's bank)
 *           URL: https://www.boc.cn/sourcedb/whpj/
 *           BOC quotes per 100 EUR → divide by 100
 * Fallback: ECB mid-market rate × 1.015 (approximate bank sell)
 *
 * Formula: FREDDY 结算价 = 银行现汇卖出价 + 0.25
 *
 * Schedule: 9:00 and 14:00 (Beijing time) daily.
 * On fetch failure, keeps the last known rate.
 */

import { getRate, setRate } from '../db.js'

const BOC_URL = 'https://www.boc.cn/sourcedb/whpj/'
const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
const FREDDY_MARKUP = 0.25

let lastFetchOk = false

/**
 * Fetch BOC 现汇卖出价, compute FREDDY rate, save to DB.
 * Falls back to ECB on failure.
 */
async function fetchAndSave() {
  const now = new Date()
  const timeLabel = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

  // ── Primary: Bank of China ──
  try {
    const res = await fetch(BOC_URL, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`BOC returned ${res.status}`)
    const html = await res.text()

    // Parse: find <td>欧元</td> then 4th <td> after it = 现汇卖出价 (per 100 EUR)
    const tds = html.match(/<td[^>]*>[^<]*<\/td>/g)
    if (!tds) throw new Error('No table cells found')

    const texts = tds.map(t => t.replace(/<[^>]+>/g, '').trim())
    let bocSell = null
    for (let i = 0; i < texts.length; i++) {
      if (texts[i] === '欧元') {
        // BOC row: name, 现汇买入, 现钞买入, 现汇卖出, 现钞卖出, 折算价, 时间
        bocSell = parseFloat(texts[i + 3]) // 现汇卖出价
        break
      }
    }

    if (!bocSell || isNaN(bocSell) || bocSell <= 0) {
      throw new Error('EUR 现汇卖出价 not found')
    }

    // BOC quotes per 100 EUR → divide by 100
    const bankRate = Math.round((bocSell / 100) * 10000) / 10000
    const freddyRate = Math.round((bankRate + FREDDY_MARKUP) * 100) / 100

    await setRate(freddyRate, `auto:BOC-现汇卖出=${bocSell}(per100)→${bankRate}+0.25`)

    console.log(`[rate] ${timeLabel} — BOC 现汇卖出: ${bocSell}/100 = ${bankRate} → FREDDY: ${freddyRate}`)
    lastFetchOk = true
    return freddyRate
  } catch (e) {
    console.warn(`[rate] ${timeLabel} — BOC failed: ${e.message}, trying ECB fallback...`)
  }

  // ── Fallback: ECB ──
  try {
    const res = await fetch(ECB_URL, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`ECB returned ${res.status}`)
    const xml = await res.text()

    const m = xml.match(/<Cube\s+currency=['"]CNY['"]\s+rate=['"]([^'"]+)['"]/)
    if (!m || !m[1]) throw new Error('CNY rate not found in ECB XML')

    const midRate = parseFloat(m[1])
    if (isNaN(midRate) || midRate <= 0) throw new Error(`Invalid rate: ${m[1]}`)

    const bankSell = Math.round(midRate * 1.015 * 10000) / 10000
    const freddyRate = Math.round((bankSell + FREDDY_MARKUP) * 100) / 100

    await setRate(freddyRate, `auto:ECB-fallback-mid=${midRate}→bank=${bankSell}+0.25`)

    console.log(`[rate] ${timeLabel} — ECB fallback: mid=${midRate} → bank: ${bankSell} → FREDDY: ${freddyRate}`)
    lastFetchOk = true
    return freddyRate
  } catch (e) {
    console.warn(`[rate] ${timeLabel} — ECB fallback also failed: ${e.message}`)
    lastFetchOk = false
    return await getRate()
  }
}

/**
 * Start the scheduled rate fetcher.
 * Runs at 09:00 and 14:00 Beijing time.
 */
export function startRateFetcher() {
  fetchAndSave()

  const interval = setInterval(() => {
    const now = new Date()
    const beijing = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
    const h = beijing.getHours()
    const m = beijing.getMinutes()

    const shouldFire =
      (h === 9 && m >= 0 && m < 30) ||
      (h === 14 && m >= 0 && m < 30)

    if (shouldFire) fetchAndSave()
  }, 30 * 60 * 1000)

  console.log('[rate] Auto-fetcher started (daily 09:00 + 14:00 Beijing time, primary: BOC)')
  return interval
}

export { fetchAndSave, lastFetchOk }
