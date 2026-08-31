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
  basic:   { key: 'basic',   name: '基础 Basic',         nameEn: 'Basic',    feeEur: 29,  color: 'border-gray-200' },
  standard:{ key: 'standard',name: '标准 Standard',      nameEn: 'Standard', feeEur: 49, color: 'border-primary', featured: true },
  premium: { key: 'premium', name: '高级 Premium',       nameEn: 'Premium',  feeEur: 79, color: 'border-gray-200' },
}

export const AR_TIER_FEES_EUR = Object.fromEntries(
  Object.entries(AR_TIERS).map(([k, v]) => [k, v.feeEur])
)

export const AR_TIER_NAMES = Object.fromEntries(
  Object.entries(AR_TIERS).map(([k, v]) => [k, v.name])
)

// ══════════════════════════════════════════════
//  CLIENT INFO CHANGE REQUEST — 客户信息修改申请
// ══════════════════════════════════════════════

// 客户可申请修改的字段（key = DB 列名，value = 中文标签）。
// 不含税号（uscc/id_number），税号由客户在「账户管理」自行保存。
export const CLIENT_CHANGEABLE_FIELDS = {
  company_name: '公司名称',
  company_name_en: '英文名',
  registered_address: '注册地址',
  registered_address_en: '注册地址(英文)',
  legal_representative: '法定代表人',
  legal_representative_en: '法定代表人(英文)',
  contact_name: '联系人',
  contact_phone: '手机号',
  wechat_id: '微信',
  lucid_registration_number: 'LUCID 注册号',
}

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
//  EKO-PUNKT 客户信息表导出 — 常量
// ══════════════════════════════════════════════

// EKO-PUNKT 导入模板固定值（下拉列的默认取值）
export const EKO_PUNKT = {
  kundengruppe: 'EASY-LIZE China',   // Kundengruppe（客户组）
  zahlungsart:  'Rechnung',          // Zahlungsart（支付方式）
  sprache:      'EN',                // Sprache（语言）
  anrede:       'Mr',                // Anrede（称呼，无法可靠判定性别，默认 Mr）
  land:         'CN',                // Land（客户中国实际地址）
}

// 材料 key → EKO-PUNKT 模板德文列头（Z~AG，与 PACKAGING_MATERIALS 顺序一致）
export const EKO_PUNKT_MATERIAL_COLS = [
  { key: 'glass',      col: 26, header: 'Glas' },
  { key: 'paper',      col: 27, header: 'Papier/Pappe/Karton' },
  { key: 'ferrous',    col: 28, header: 'Eisenmetalle' },
  { key: 'aluminium',  col: 29, header: 'Aluminium' },
  { key: 'plastics',   col: 30, header: 'Kunststoff' },
  { key: 'cartons',    col: 31, header: 'Getränkekartonverbunde' },
  { key: 'composites', col: 32, header: 'Sonstige Verbunde' },
  { key: 'other',      col: 33, header: 'Sonstiges Material' },
]

// 服务等级 → 中文（LIVANTO 季度结算单用）
export const AR_TIER_ZH = { basic: '基础', standard: '标准', premium: '高级' }

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

/** Calculate recycling fee for one material: kg * rate (individual, no floor) */
export function calcMaterialFee(materialKey, totalKg) {
  const mat = PACKAGING_MATERIALS.find(m => m.key === materialKey)
  if (!mat || totalKg <= 0) return 0
  const rate = getRecyclingRate(materialKey, totalKg)
  return Math.round(totalKg * rate * 100) / 100
}

/** Apply minFee floor to TOTAL of all materials: max(minFee, sum of all materials' kg × rate) */
export function applyFloorFee(totalFee, minFee = 28.90) {
  return Math.max(minFee, totalFee)
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

// 中文字符（CJK 统一表意文字），用于「英文/拼音字段禁止中文」校验
export const CHINESE_CHAR_RE = /[一-鿿]/
export const containsChinese = (s) => CHINESE_CHAR_RE.test(String(s ?? ''))

// ══════════════════════════════════════════════
//  BACKEND-SPECIFIC (imported via relative path)
// ══════════════════════════════════════════════

export default {
  AR_TIERS, AR_TIER_FEES_EUR, AR_TIER_NAMES, CLIENT_CHANGEABLE_FIELDS,
  WEEE_PRICES, WEEE_STARTING_PRICE,
  BATTERY_PRICES, BATTERY_STARTING_PRICE,
  EUR_CNY_RATE, PACKAGING_MATERIALS,
  EKO_PUNKT, EKO_PUNKT_MATERIAL_COLS, AR_TIER_ZH,
  REMINDER_WINDOWS, REPORTING_DEADLINE_MONTH, REPORTING_DEADLINE_DAY,
  EMAIL_RE, PHONE_RE, CHINESE_CHAR_RE, containsChinese,
}
