/**
 * 日期工具 — 统一按「北京时间（服务器本地 Asia/Shanghai）」输出。
 *
 * 背景：原代码多处用 `new Date().toISOString().slice(0, 10)`，toISOString 按 UTC 输出，
 * 在 Asia/Shanghai(UTC+8) 会早一天，导致合同 start_date/end_date、发票日期、签署日期偏一天。
 * 这里统一用本地时区的 getFullYear/getMonth/getDate 手拼，避免时区偏移。
 */

/** Date 对象 → 'YYYY-MM-DD'（服务器本地时区 = 北京时间） */
export function localDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * SQLite CURRENT_TIMESTAMP 存的 'YYYY-MM-DD HH:MM:SS' 是 UTC，
 * 转成北京时间的日期字符串（用于合同/发票上的「日期」字段）。
 */
export function beijingDateFromUtc(utcStr) {
  if (!utcStr) return localDate()
  return localDate(new Date(utcStr.replace(' ', 'T') + 'Z'))
}
