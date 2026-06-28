/**
 * FREDDY EPR Platform — Shared Constants
 *
 * Centralizes all pricing, configuration, and magic numbers used across
 * frontend and backend. Edit here → updates everywhere.
 *
 * @module shared/constants
 */

// ══════════════════════════════════════════════
//  PACKAGING AR — 包装法授权代表
// ══════════════════════════════════════════════

export const AR_TIERS = {
  basic:   { key: 'basic',   name: '基础 Basic',         nameEn: 'Basic',    feeEur: 89,  color: 'border-gray-200' },
  standard:{ key: 'standard',name: '标准 Standard',      nameEn: 'Standard', feeEur: 159, color: 'border-primary', featured: true },
  premium: { key: 'premium', name: '高级 Premium',       nameEn: 'Premium',  feeEur: 249, color: 'border-gray-200' },
}

export const AR_TIER_FEES_EUR = Object.fromEntries(
  Object.entries(AR_TIERS).map(([k, v]) => [k, v.feeEur])
)

export const AR_TIER_NAMES = Object.fromEntries(
  Object.entries(AR_TIERS).map(([k, v]) => [k, v.name])
)

// ══════════════════════════════════════════════
//  WEEE — 电子电气设备法
// ══════════════════════════════════════════════

export const WEEE_PRICES = {
  baseFee:          129.00,  // WEEE Return basic
  insolvencyFee:    149.00,  // Insolvency guarantee
  earQuarterly:       3.80,  // EAR quarterly fee per brand
  earBrandReg:        9.50,  // EAR per-brand registration
  extraCategory:     99.00,  // Each additional device category
  extraBrand:        79.95,  // Each additional brand
  authFirstYear:     50.76,  // EAR one-time authorization (first year only)
}

export const WEEE_STARTING_PRICE = 278 // Display: "€278/年起"

// ══════════════════════════════════════════════
//  BATTERY — 电池法 BattG
// ══════════════════════════════════════════════

export const BATTERY_PRICES = {
  baseFee:          129.00,  // BattG basic registration
  takebackFee:      129.00,  // Take-back system participation
  earMembership:     48.00,  // EAR annual membership
  earQuarterly:       3.80,  // EAR quarterly fee
  earBrandReg:       16.40,  // EAR per-brand registration
  extraBrand:        49.00,  // Each additional brand
  authFirstYear:     50.76,  // EAR one-time authorization (first year only)
}

export const BATTERY_STARTING_PRICE = 258 // Display: "€258/年起"

// ══════════════════════════════════════════════
//  PAYMENT
// ══════════════════════════════════════════════

export const EUR_CNY_RATE = 7.8

// ══════════════════════════════════════════════
//  PACKAGING MATERIALS
// ══════════════════════════════════════════════

// Source: 回收费价目单_2026 / EASY-LIZE China 2026
export const PACKAGING_MATERIALS = [
  { key: 'glass',      label: '玻璃 / Glas',                minFee: 28.90, tiers: [{ toKg: 49.999, rate: 0.24 }, { toKg: 99.999, rate: 0.17 }, { toKg: Infinity, rate: 0.12 }] },
  { key: 'paper',      label: '纸/纸板 / Papier/Pappe',     minFee: 28.90, tiers: [{ toKg: 49.999, rate: 0.33 }, { toKg: 99.999, rate: 0.27 }, { toKg: 999.999, rate: 0.25 }, { toKg: Infinity, rate: 0.22 }] },
  { key: 'ferrous',    label: '黑色金属 / Eisenmetalle',    minFee: 28.90, tiers: [{ toKg: Infinity, rate: 0.99 }] },
  { key: 'aluminium',  label: '铝 / Aluminium',             minFee: 28.90, tiers: [{ toKg: Infinity, rate: 0.99 }] },
  { key: 'plastics',   label: '塑料 / Kunststoffe',         minFee: 28.90, tiers: [{ toKg: Infinity, rate: 0.999 }] },
  { key: 'cartons',    label: '饮料纸盒 / Getränkekarton',  minFee: 28.90, tiers: [{ toKg: Infinity, rate: 0.999 }] },
  { key: 'composites', label: '其他复合包装 / Sonstige Verbunde', minFee: 28.90, tiers: [{ toKg: Infinity, rate: 0.999 }] },
  { key: 'other',      label: '其他 / Sonstige Materialien', minFee: 28.90, tiers: [{ toKg: 99.999, rate: 0.1999 }, { toKg: 199.999, rate: 0.13 }, { toKg: Infinity, rate: 0.11 }] },
]

/** Get per-kg rate for a material at a given total kg (tiered pricing) */
export function getRecyclingRate(materialKey, totalKg) {
  const mat = PACKAGING_MATERIALS.find(m => m.key === materialKey)
  if (!mat) return 0
  for (const t of mat.tiers) {
    if (totalKg <= t.toKg) return t.rate
  }
  return mat.tiers[mat.tiers.length - 1].rate
}

/** Calculate recycling fee for one material: max(kg * rate, minFee) */
export function calcMaterialFee(materialKey, totalKg) {
  const mat = PACKAGING_MATERIALS.find(m => m.key === materialKey)
  if (!mat || totalKg <= 0) return 0
  const rate = getRecyclingRate(materialKey, totalKg)
  return Math.max(mat.minFee, Math.round(totalKg * rate * 100) / 100)
}

// ══════════════════════════════════════════════
//  REMINDER
// ══════════════════════════════════════════════

export const REMINDER_WINDOWS = [30, 14, 5]        // days before deadline
export const REPORTING_DEADLINE_MONTH = 2           // February
export const REPORTING_DEADLINE_DAY = 15            // 15th

// ══════════════════════════════════════════════
//  EMAIL REGEX
// ══════════════════════════════════════════════

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/

// ══════════════════════════════════════════════
//  BACKEND-SPECIFIC (imported via relative path)
// ══════════════════════════════════════════════

export default {
  AR_TIERS, AR_TIER_FEES_EUR, AR_TIER_NAMES,
  WEEE_PRICES, WEEE_STARTING_PRICE,
  BATTERY_PRICES, BATTERY_STARTING_PRICE,
  EUR_CNY_RATE, PACKAGING_MATERIALS,
  REMINDER_WINDOWS, REPORTING_DEADLINE_MONTH, REPORTING_DEADLINE_DAY,
  EMAIL_RE, PHONE_RE,
}
