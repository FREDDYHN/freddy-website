/**
 * FREDDY EPR — Bank Transfer Info（对公收款账户）
 * 单一数据源：/api/bank-info 接口与支付 QR 页共用，避免多处硬编码。
 */
export function getBankInfo() {
  return {
    bank_name: '中国银行股份有限公司淮南分行',
    bank_address: '安徽省淮南市龙湖路21号',
    bank_code: 'BKCHCNBJ780',
    account_name: '福瑞笛（上海）信息咨询有限公司淮南分公司',
    account_number: process.env.BANK_ACCOUNT || '181276312093',
    swift: 'BKCHCNBJ780',
    company_address: '安徽省淮南市中环国际广场158金融中心四层418室',
    company_tax_id: '91340400MADDK97K4X',
    reference_prefix: 'EPR-',
    note: '请在转账附言中注明合同编号或公司名称，以便我们快速确认到账。',
  }
}
