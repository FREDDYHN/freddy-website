/**
 * Generic IP-based rate limiter.
 * Extracted from auth.js login rate-limit pattern — supports per-route configs.
 */
const limiters = new Map()

// Cleanup stale entries every 30 min
setInterval(() => {
  for (const [key, limiter] of limiters) {
    const cutoff = Date.now() - limiter.windowMs
    for (const [ip, r] of limiter.map) {
      if (r.start < cutoff) limiter.map.delete(ip)
    }
  }
}, 30 * 60 * 1000)

/**
 * Create (or reuse) a named rate limiter.
 * @param {string} name      - unique name for this limiter (e.g. 'contract-create')
 * @param {number} maxAttempts - max requests within the window
 * @param {number} windowMs   - sliding window in milliseconds
 * @returns {(ip: string) => boolean} — returns true if allowed, false if rate-limited
 */
export function createRateLimiter(name, maxAttempts, windowMs) {
  if (limiters.has(name)) return limiters.get(name).check

  const map = new Map()
  const limiter = { map, windowMs, maxAttempts }
  limiters.set(name, limiter)

  const check = (ip) => {
    const now = Date.now()
    const record = map.get(ip)
    if (!record || now - record.start > windowMs) {
      map.set(ip, { start: now, count: 1 })
      return true
    }
    record.count++
    return record.count <= maxAttempts
  }

  limiter.check = check
  return check
}

/**
 * Express middleware factory.
 * Usage: router.post('/path', rateLimit('my-limit', 3, 600_000), handler)
 */
export function rateLimit(name, maxAttempts, windowMs) {
  const check = createRateLimiter(name, maxAttempts, windowMs)
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown'
    if (!check(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.', retry_after_seconds: Math.ceil(windowMs / 1000) })
    }
    next()
  }
}
