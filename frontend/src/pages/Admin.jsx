import { useState, useEffect } from 'react'

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [contracts, setContracts] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const authHeaders = () => {
    const token = sessionStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, contractsRes, remindersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders() }),
        fetch('/api/admin/contracts', { headers: authHeaders() }),
        fetch('/api/admin/reminders', { headers: authHeaders() }),
      ])

      if (!statsRes.ok || !contractsRes.ok) {
        if (statsRes.status === 401 || contractsRes.status === 401) {
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('user')
          window.dispatchEvent(new Event('auth:expired'))
          throw new Error('login_required')
        }
        throw new Error('Admin access required')
      }

      const [statsData, contractsResolved, remindersData] = await Promise.all([
        statsRes.json(),
        contractsRes.json(),
        remindersRes.json().catch(() => []),
      ])

      setStats(statsData)
      // contractsResolved may be {data, pagination} (new) or plain array (legacy)
      setContracts(Array.isArray(contractsResolved) ? contractsResolved : (contractsResolved.data || []))
      setReminders(Array.isArray(remindersData) ? remindersData : [])
    } catch (e) {
      if (e.message !== 'login_required') setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleTriggerReminders = async () => {
    try {
      const res = await fetch('/api/admin/reminders/check', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        alert('提醒检查完成')
        loadData()
      } else {
        alert('操作失败')
      }
    } catch (e) {
      alert('请求失败: ' + e.message)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  // ── Auth Error ──
  if (error === 'login_required') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">需要管理员登录</h1>
        <p className="text-gray-500">请使用管理员账号登录</p>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-4 text-red-600">加载失败</h1>
        <p className="text-gray-500 mb-4">{error}</p>
        <button onClick={loadData} className="px-4 py-2 border rounded-lg text-sm">重试</button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">管理后台</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: '总客户数', value: stats.total_clients },
          { label: '活跃合同', value: stats.active_contracts },
          { label: '待付款', value: stats.pending_payments, warn: stats.pending_payments > 0 },
          { label: '年收入 (€)', value: '€' + (stats.annual_revenue_eur || 0) },
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
          <h2 className="font-bold">合同列表 ({contracts.length})</h2>
          <button onClick={handleTriggerReminders} className="text-sm text-primary font-medium hover:underline">
            手动触发提醒 →
          </button>
        </div>
        <div className="overflow-x-auto">
          {contracts.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">暂无合同数据</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3 font-medium">合同编号</th>
                  <th className="p-3 font-medium">公司</th>
                  <th className="p-3 font-medium">套餐</th>
                  <th className="p-3 font-medium">年费</th>
                  <th className="p-3 font-medium">状态</th>
                  <th className="p-3 font-medium">LUCID</th>
                  <th className="p-3 font-medium">起始</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{c.contract_number}</td>
                    <td className="p-3">{c.company_name}<br /><span className="text-xs text-gray-400">{c.contact_email}</span></td>
                    <td className="p-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.tier?.toUpperCase()}</span></td>
                    <td className="p-3">€{c.annual_fee_eur}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span></td>
                    <td className="p-3">{c.lucid_confirmed ? '✅' : '⚠️'}</td>
                    <td className="p-3 text-xs text-gray-500">{c.start_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reminders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold">已发提醒 ({reminders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          {reminders.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">暂无提醒记录</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">合同</th>
                  <th className="p-3">类型</th>
                  <th className="p-3">截止日期</th>
                  <th className="p-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map(r => (
                  <tr key={r.id} className="border-t border-gray-50">
                    <td className="p-3 font-mono text-xs">{r.contract_number}</td>
                    <td className="p-3">{r.reminder_type === 'reporting' ? '数据申报' : '合同续期'}</td>
                    <td className="p-3">{r.due_date}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.status === 'sent' ? '已发送' : r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
