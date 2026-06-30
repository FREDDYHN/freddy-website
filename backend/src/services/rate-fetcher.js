/**
 * EUR/CNY Rate Fetcher
 *
 * Fetches the mid-market EUR/CNY rate from ECB (free, no API key, no limits).
 * Then applies: 银行现汇卖出价 ≈ mid * 1.015 (1.5% bank spread)
 *              FREDDY 结算价 = 银行卖出价 + 0.25
 *
 * Schedule: 9:00 and 14:00 (Beijing time) daily.
 * On fetch failure, keeps the last known rate.
 */

import { getRate, setRate } from '../db.js'

const FETCH_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
const BANK_SPREAD = 1.015   // mid → 现汇卖出价 (1.5% bank spread)
const FREDDY_MARKUP = 0.25  // FREDDY service markup on top

let lastFetchOk = false

/**
 * Fetch ECB mid-market rate, compute FREDDY settlement rate, save to DB.
 * Returns the new rate, or null if fetch failed.
 */
async function fetchAndSave() {
  const now = new Date()
  const timeLabel = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

  try {
    const res = await fetch(FETCH_URL, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`ECB returned ${res.status}`)
    const xml = await res.text()

    // Parse: <Cube currency='CNY' rate='8.1234'/>
    const m = xml.match(/<Cube\s+currency=['"]CNY['"]\s+rate=['"]([^'"]+)['"]/)
    if (!m || !m[1]) throw new Error('CNY rate not found in ECB XML')

    const midRate = parseFloat(m[1])
    if (isNaN(midRate) || midRate <= 0) throw new Error(`Invalid rate: ${m[1]}`)

    // 现汇卖出价 ≈ mid × bank spread
    const bankSell = Math.round(midRate * BANK_SPREAD * 10000) / 10000
    // FREDDY 结算价 = bank sell + 0.25
    const freddyRate = Math.round((bankSell + FREDDY_MARKUP) * 100) / 100

    await setRate(freddyRate, `auto:ECB-mid=${midRate}→bank=${bankSell}+0.25`)

    console.log(`[rate] ${timeLabel} — ECB mid: ${midRate} → bank sell: ${bankSell} → FREDDY: ${freddyRate}`)
    lastFetchOk = true
    return freddyRate
  } catch (e) {
    console.warn(`[rate] ${timeLabel} — fetch failed: ${e.message}`)
    lastFetchOk = false
    // Return current rate from DB so caller knows what's still active
    return await getRate()
  }
}

/**
 * Start the scheduled rate fetcher.
 * Runs at 09:00 and 14:00 Beijing time.
 */
export function startRateFetcher() {
  // Fetch immediately on startup
  fetchAndSave()

  // Schedule: check every 30 minutes, fire at 9:00 and 14:00
  const interval = setInterval(() => {
    const now = new Date()
    const beijing = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
    const h = beijing.getHours()
    const m = beijing.getMinutes()

    // Fire at 09:00-09:29 or 14:00-14:29
    const shouldFire =
      (h === 9 && m >= 0 && m < 30) ||
      (h === 14 && m >= 0 && m < 30)

    if (shouldFire) {
      fetchAndSave()
    }
  }, 30 * 60 * 1000) // check every 30 min

  console.log('[rate] Auto-fetcher started (daily 09:00 + 14:00 Beijing time)')
  return interval
}

export { fetchAndSave, lastFetchOk }
