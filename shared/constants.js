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
  country: '国家/地区',
  vat_id: 'USt-IdNr / 增值税号',
}

// ══════════════════════════════════════════════
//  客户国家/地区 + 税号校验
// ══════════════════════════════════════════════

// 客户注册国家/地区（完整下拉，存 ISO 3166-1 alpha-2 码）
export const CLIENT_COUNTRIES = [
  { code: 'CN', label: '中国' }, { code: 'HK', label: '中国香港' }, { code: 'MO', label: '中国澳门' },
  { code: 'DE', label: '德国' }, { code: 'IT', label: '意大利' }, { code: 'FR', label: '法国' },
  { code: 'ES', label: '西班牙' }, { code: 'NL', label: '荷兰' }, { code: 'BE', label: '比利时' },
  { code: 'AT', label: '奥地利' }, { code: 'PL', label: '波兰' }, { code: 'PT', label: '葡萄牙' },
  { code: 'CZ', label: '捷克' }, { code: 'SE', label: '瑞典' }, { code: 'DK', label: '丹麦' },
  { code: 'FI', label: '芬兰' }, { code: 'IE', label: '爱尔兰' }, { code: 'LU', label: '卢森堡' },
  { code: 'GR', label: '希腊' }, { code: 'HU', label: '匈牙利' }, { code: 'RO', label: '罗马尼亚' },
  { code: 'BG', label: '保加利亚' }, { code: 'SK', label: '斯洛伐克' }, { code: 'SI', label: '斯洛文尼亚' },
  { code: 'LT', label: '立陶宛' }, { code: 'LV', label: '拉脱维亚' }, { code: 'EE', label: '爱沙尼亚' },
  { code: 'HR', label: '克罗地亚' }, { code: 'CY', label: '塞浦路斯' }, { code: 'MT', label: '马耳他' },
  { code: 'CH', label: '瑞士' }, { code: 'GB', label: '英国' }, { code: 'US', label: '美国' },
  { code: 'OTHER', label: '其他海外' },
]

// 欧盟 27 国（含德国）
export const EU_COUNTRY_CODES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']

// 需填 USt-IdNr 的欧盟国家（除德国）
export const EU_VAT_REQUIRED_CODES = EU_COUNTRY_CODES.filter((c) => c !== 'DE')

// 中国区域（走统一社会信用代码 / 身份证 / HK 商业登记号逻辑）
export const CN_REGION_CODES = ['CN', 'HK', 'MO']

// 境外税号宽松格式：字母 + 数字，4-20 位
export const FOREIGN_TAX_RE = /^[A-Za-z0-9]{4,20}$/

export const needsVatId = (country) => EU_VAT_REQUIRED_CODES.includes(country)

// 统一的税号校验（返回值：错误文案 或 null）
export function taxError(country, entityType, value) {
  const v = String(value || '').trim()
  if (!v) return '请输入税号'
  if (CN_REGION_CODES.includes(country)) {
    if (entityType === 'individual') {
      return /^\d{17}[\dXx]$/.test(v) ? null : '身份证号码格式不正确（18位）'
    }
    return /^([0-9A-Za-z]{18}|\d{8})$/.test(v) ? null : '税号格式不正确（18位统一社会信用代码，或8位香港商业登记号）'
  }
  return FOREIGN_TAX_RE.test(v.toUpperCase()) ? null : '税号格式不正确（4-20位字母或数字）'
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
  email:        'info@freddy-epr.com',  // E-Mail（统一收发邮箱：EKO-PUNKT 材料发这里，再由我们转发客户）
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
// 2026-10-29 起：EKO-PUNKT 对 8/15 之后缴费的客户 +30% 惩罚性涨价，故 rate = 原基础价 × 1.3。
// 原基础价（追溯用）：glass .24/.17/.12、paper .33/.27/.25/.22、ferrous/aluminium .99、
// plastics/cartons/composites .999、other .1999/.13/.11。minFee 28.90 不变。
export const PACKAGING_MATERIALS = [
  { key: 'glass',      label: '玻璃 / Glas',                minFee: 28.90, tiers: [{ toKg: 49.999, rate: 0.312 }, { toKg: 99.999, rate: 0.221 }, { toKg: Infinity, rate: 0.156 }] },
  { key: 'paper',      label: '纸/纸板 / Papier/Pappe',     minFee: 28.90, tiers: [{ toKg: 49.999, rate: 0.429 }, { toKg: 99.999, rate: 0.351 }, { toKg: 999.999, rate: 0.325 }, { toKg: Infinity, rate: 0.286 }] },
  { key: 'ferrous',    label: '黑色金属 / Eisenmetalle',    minFee: 28.90, tiers: [{ toKg: Infinity, rate: 1.287 }] },
  { key: 'aluminium',  label: '铝 / Aluminium',             minFee: 28.90, tiers: [{ toKg: Infinity, rate: 1.287 }] },
  { key: 'plastics',   label: '塑料 / Kunststoffe',         minFee: 28.90, tiers: [{ toKg: Infinity, rate: 1.2987 }] },
  { key: 'cartons',    label: '饮料纸盒 / Getränkekarton',  minFee: 28.90, tiers: [{ toKg: Infinity, rate: 1.2987 }] },
  { key: 'composites', label: '其他复合包装 / Sonstige Verbunde', minFee: 28.90, tiers: [{ toKg: Infinity, rate: 1.2987 }] },
  { key: 'other',      label: '其他 / Sonstige Materialien', minFee: 28.90, tiers: [{ toKg: 99.999, rate: 0.2599 }, { toKg: 199.999, rate: 0.169 }, { toKg: Infinity, rate: 0.143 }] },
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
//  EKO-PUNKT 邮编映射（区县/县级市/镇 → 中国 6 位邮编）
//  区县级比地级市精确（地级市下各区县邮编不同）；resolvePlz 里扫地址命中，命中不到则留空人工补
// ══════════════════════════════════════════════
export const DISTRICT_POSTCODES = {
  // 深圳
  '宝安区': '518101', '龙岗区': '518116', '罗湖区': '518001', '龙华区': '518110',
  '龙华新区': '518110', '南山区': '518052', '福田区': '518000', '光明区': '518107', '盐田区': '518081',
  // 广州
  '天河区': '510630', '黄埔区': '510700', '白云区': '510080', '从化区': '510900',
  '番禺区': '511400', '南沙区': '511458', '越秀区': '510030', '海珠区': '510220',
  '荔湾区': '510145', '花都区': '510800',
  // 东莞（直筒子市，按镇/街道）
  '虎门镇': '523900', '茶山镇': '523380', '万江街道': '523050', '东城街道': '523000',
  '塘厦镇': '523710', '黄江镇': '523750', '长安镇': '523841', '大朗镇': '523770',
  '厚街镇': '523960', '石碣镇': '523290',
  // 金华 / 义乌
  '义乌市': '322000', '义鸟市': '322000', '婺城区': '321000', '浦江县': '322200',
  '东阳市': '322100', '武义县': '321200',
  // 泉州 / 晋江
  '晋江市': '362200', '鲤城区': '362000', '丰泽区': '362000',
  // 莆田
  '涵江区': '351111', '荔城区': '351100', '秀屿区': '351146', '仙游县': '351200', '城厢区': '351100',
  // 上饶
  '广信区': '334100', '铅山县': '334500', '弋阳县': '334400', '信州区': '334000',
  // 临沂
  '沂水县': '276400', '兰山区': '276000',
  // 宁波
  '鄞州区': '315100', '勤州区': '315100', '奉化区': '315500', '海曙区': '315000', '江北区': '315020',
  // 太原
  '小店区': '030032', '迎泽区': '030000',
  // 济宁
  '任城区': '272000', '汶上县': '272500', '微山县': '277600', '兖州区': '272000', '济宁高新区': '272000', '济宁市高新区': '272000',
  // 临汾
  '洪洞县': '041600', '尧都区': '041000',
  // 西安
  '雁塔区': '710061', '未央区': '710000', '碑林区': '710001',
  // 周口
  '鹿邑县': '477200',
  // 温州
  '乐清市': '325600', '苍南县': '325800', '鹿城区': '325000',
  // 上海
  '奉贤区': '201400', '浦东新区': '200000',
  // 汕头
  '潮南区': '515100', '潮阳区': '515100',
  // 长沙
  '浏阳市': '410300', '望城区': '410200', '雨花区': '410000',
  // 武汉
  '洪山区': '430070', '蔡甸区': '430100', '武昌区': '430060', '江汉区': '430000',
  // 潮州
  '潮安区': '515638', '湘桥区': '521000',
  // 佛山
  '禅城区': '528000', '南海区': '528200', '顺德区': '528300',
  // 郑州
  '新郑市': '451100', '中原区': '450007', '中牟县': '451450', '金水区': '450000',
  // 青岛
  '城阳区': '266109', '黄岛区': '266500', '市南区': '266000',
  // 惠州
  '惠阳区': '516200', '惠城区': '516000',
  // 蚌埠
  '怀远县': '233400', '蚌山区': '233000',
  // 菏泽
  '巨野县': '274900', '曹县': '274400', '牡丹区': '274000',
  // 衢州
  '龙游县': '324400', '柯城区': '324000',
  // 大连
  '中山区': '116001', '西岗区': '116000',
  // 绥化
  '北林区': '152000',
  // 赣州
  '章贡区': '341000',
  // 宜昌
  '枝江市': '443200', '西陵区': '443000',
  // 台州
  '临海市': '317000', '椒江区': '318000',
  // 绍兴
  '诸暨市': '311800', '越城区': '312000', '柯桥区': '312000',
  // 汕尾 / 陆丰
  '陆丰市': '516500', '海丰县': '516400',
  // 宜宾
  '南溪区': '644100', '翠屏区': '644000',
  // 昆明
  '盘龙区': '650051', '五华区': '650000',
  // 邯郸
  '复兴区': '056003', '丛台区': '056000',
  // 包头
  '昆都仑区': '014010',
  // 天津
  '河西区': '300202',
  // 直辖市 / 特别行政区（兜底）
  '北京市': '100000', '上海市': '200000', '天津市': '300000', '重庆市': '400000',
  '香港': '999077', '澳门': '999078',
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
  CLIENT_COUNTRIES, EU_COUNTRY_CODES, EU_VAT_REQUIRED_CODES, CN_REGION_CODES, FOREIGN_TAX_RE,
  needsVatId, taxError,
}
