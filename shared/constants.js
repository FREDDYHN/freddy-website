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

export const PACKAGING_MATERIALS = [
  { key: 'glass',       label: '玻璃 / Glas',                dualSystemMin: 0.02, dualSystemMax: 0.05 },
  { key: 'paper',       label: '纸/纸板 / Papier/Pappe',     dualSystemMin: 0.02, dualSystemMax: 0.15 },
  { key: 'ferrous',     label: '黑色金属 / Eisenmetalle',    dualSystemMin: 0.15, dualSystemMax: 0.40 },
  { key: 'aluminium',   label: '铝 / Aluminium',             dualSystemMin: 0.15, dualSystemMax: 0.40 },
  { key: 'plastics',    label: '塑料 / Kunststoffe',         dualSystemMin: 0.30, dualSystemMax: 0.80 },
  { key: 'composites',  label: '复合材料 / Verbunde',        dualSystemMin: 0.20, dualSystemMax: 0.50 },
  { key: 'cartons',     label: '饮料纸盒 / Getränkekarton',  dualSystemMin: 0.15, dualSystemMax: 0.35 },
  { key: 'other',       label: '其他 / Sonstige',            dualSystemMin: 0.02, dualSystemMax: 0.50 },
]

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
