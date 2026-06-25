import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

// Mock data for demo — in production, fetch from API with auth
const MOCK = {
  client: { id: 1, company_name: 'Test Export Co Ltd', contact_name: 'Zhang San', contact_email: 'z@t.com', lucid_registration_number: null, status: 'active' },
  contracts: [
    { id: 1, contract_number: 'LTO-AR-2026-0001', tier: 'standard', annual_fee_eur: 159, start_date: '2026-07-01', end_date: '2027-06-30', status: 'active', lucid_confirmed: 0, signed_at: '2026-06-25T18:51:40Z' },
  ],
  packaging: [
    { id: 1, declaration_year: 2026, material_type: 'Paper/Cardboard', category: 'B2C', estimated_quantity_kg: 100 },
    { id: 2, declaration_year: 2026, material_type: 'Plastics', category: 'B2C', estimated_quantity_kg: 50 },
  ],
  payments: [
    { id: 1, amount_eur: 159, amount_cny: 1240.2, payment_method: 'wechat', status: 'paid', paid_at: '2026-06-25', out_trade_no: 'EPRMQTUYHWQFFF8E0' },
  ],
  invoices: [
    { id: 1, invoice_number: 'INV-MQTUYHWQ', amount_eur: 159, status: 'issued', invoice_date: '2026-06-25' },
  ],
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setTimeout(() => { setData(MOCK); setLoading(false) }, 600) }, [])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-48"/><div className="h-32 bg-gray-100 rounded"/></div></div>
  if (!data?.contracts?.length) return <div className="max-w-4xl mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-bold mb-4">暂无合同</h1><p className="text-gray-500">请先 <Link to="/signup" className="text-primary underline">在线签约</Link>，或通过合同编号查询。</p></div>

  const c = data.contracts[0]
  const now = new Date()
  const end = new Date(c.end_date)
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  // Next reporting deadline: Feb 15
  const reportYear = now.getMonth() < 1 ? now.getFullYear() : now.getFullYear() + 1
  const reportDeadline = new Date(reportYear, 1, 15)
  const daysToReport = Math.ceil((reportDeadline - now) / (1000 * 60 * 60 * 24))

  const statusColor = { active: 'bg-green-100 text-green-700', pending_payment: 'bg-yellow-100 text-yellow-700', signed: 'bg-blue-100 text-blue-700', expired: 'bg-red-100 text-red-700' }
  const statusLabel = { active: '已激活', pending_payment: '待付款', signed: '已签署', expired: '已过期' }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-wrap items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">我的合规面板</h1>
          <p className="text-gray-500 text-sm">{data.client.company_name}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[c.status] || ''}`}>{statusLabel[c.status] || c.status}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '合同编号', value: c.contract_number, sub: c.tier?.toUpperCase() },
          { label: '年费', value: '€' + c.annual_fee_eur, sub: '含AR服务' },
          { label: '合同剩余', value: daysLeft + ' 天', sub: c.end_date, warn: daysLeft < 60 },
          { label: '距申报截止', value: daysToReport + ' 天', sub: reportYear + '-02-15', warn: daysToReport < 45 },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.warn ? 'text-red-600' : 'text-primary'}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* LUCID Status */}
      <div className={`rounded-xl p-6 mb-8 shadow-sm border ${c.lucid_confirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{c.lucid_confirmed ? '✅' : '⚠️'}</span>
          <div>
            <h3 className="font-bold">{c.lucid_confirmed ? 'LUCID 已确认' : 'LUCID 待确认'}</h3>
            <p className="text-sm text-gray-600">
              {c.lucid_confirmed
                ? 'LIVANTO GmbH 已在LUCID系统中确认授权，您的合规已生效。'
                : '请在LUCID系统中将 LIVANTO GmbH 指定为授权代表（使用ID: [待提供]）。完成后合同方可完全激活。'}
            </p>
          </div>
          {!c.lucid_confirmed && (
            <a href="#" className="ml-auto px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium whitespace-nowrap">查看指南 →</a>
          )}
        </div>
      </div>

      {/* Two Columns: Packaging + Payments */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Packaging Data */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold mb-4">包装申报 ({data.packaging.length} 种)</h3>
          <div className="space-y-2">
            {data.packaging.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
                <span>{p.material_type}</span>
                <span className="text-gray-400 text-xs">{p.category}</span>
                <span className="font-medium">{p.estimated_quantity_kg} kg</span>
              </div>
            ))}
          </div>
          <button className="mt-4 text-sm text-primary font-medium">+ 更新申报数据</button>
        </div>

        {/* Payments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold mb-4">支付记录</h3>
          <div className="space-y-2">
            {data.payments.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
                <div>
                  <span className="font-medium">¥{p.amount_cny}</span>
                  <span className="text-gray-400 text-xs ml-2">{p.payment_method === 'wechat' ? '微信' : p.payment_method}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status === 'paid' ? '已付' : '待付'}</span>
                <span className="text-xs text-gray-400">{p.paid_at}</span>
              </div>
            ))}
          </div>
          {data.invoices.map(inv => (
            <div key={inv.id} className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-500">发票 {inv.invoice_number}</span>
              <span className="font-medium">€{inv.amount_eur}</span>
              <span className="text-xs text-green-600">{inv.status === 'issued' ? '已开具' : inv.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Downloads */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold mb-4">快速下载</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <a href="/projects/contracts/LIVANTO/Bevollmächtigungsvertrag_02.docx" className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center gap-2">
            <span className="text-lg">📄</span> 授权代表合同 (V2)
          </a>
          <a href="#" className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center gap-2">
            <span className="text-lg">📘</span> LUCID 注册指南 (即将上线)
          </a>
          <a href="/calculator" className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center gap-2">
            <span className="text-lg">🧮</span> 费用计算器
          </a>
        </div>
      </div>
    </div>
  )
}
