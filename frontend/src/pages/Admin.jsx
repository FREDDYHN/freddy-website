import { useState, useEffect } from 'react'

const MOCK = {
  stats: { total_clients: 1, active_contracts: 1, pending_payments: 0, annual_revenue_eur: 159 },
  contracts: [
    { id: 1, contract_number: 'LTO-AR-2026-0001', company_name: 'Test Export Co Ltd', tier: 'standard', annual_fee_eur: 159, status: 'active', lucid_confirmed: 0, start_date: '2026-07-01', contact_email: 'z@t.com' },
  ],
  reminders: [
    { id: 1, contract_number: 'LTO-AR-2026-0001', type: 'reporting', due_date: '2027-02-15', status: 'pending' },
  ],
}

export default function Admin() {
  const [data, setData] = useState(null)

  useEffect(() => { setTimeout(() => setData(MOCK), 500) }, [])

  if (!data) return <div className="max-w-5xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-64"/></div></div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">管理后台</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: '总客户数', value: data.stats.total_clients },
          { label: '活跃合同', value: data.stats.active_contracts },
          { label: '待付款', value: data.stats.pending_payments, warn: data.stats.pending_payments > 0 },
          { label: '年收入 (€)', value: '€' + data.stats.annual_revenue_eur },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.warn ? 'text-red-600' : 'text-primary'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-10">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold">合同列表</h2>
          <button onClick={() => fetch('/api/admin/reminders/check').catch(() => {})} className="text-sm text-primary font-medium">手动触发提醒 →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3 font-medium">合同编号</th><th className="p-3 font-medium">公司</th><th className="p-3 font-medium">套餐</th>
                <th className="p-3 font-medium">年费</th><th className="p-3 font-medium">状态</th><th className="p-3 font-medium">LUCID</th><th className="p-3 font-medium">起始</th>
              </tr>
            </thead>
            <tbody>
              {data.contracts.map(c => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{c.contract_number}</td>
                  <td className="p-3">{c.company_name}<br/><span className="text-xs text-gray-400">{c.contact_email}</span></td>
                  <td className="p-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.tier?.toUpperCase()}</span></td>
                  <td className="p-3">€{c.annual_fee_eur}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span></td>
                  <td className="p-3">{c.lucid_confirmed ? '✅' : '⚠️'}</td>
                  <td className="p-3 text-xs text-gray-500">{c.start_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reminders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h2 className="font-bold">待发提醒</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left"><tr><th className="p-3">合同</th><th className="p-3">类型</th><th className="p-3">截止日期</th><th className="p-3">状态</th></tr></thead>
            <tbody>
              {data.reminders.map(r => (
                <tr key={r.id} className="border-t border-gray-50">
                  <td className="p-3 font-mono text-xs">{r.contract_number}</td>
                  <td className="p-3">{r.type === 'reporting' ? '数据申报' : '合同续期'}</td>
                  <td className="p-3">{r.due_date}</td>
                  <td className="p-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
