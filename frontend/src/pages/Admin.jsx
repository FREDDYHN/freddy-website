import { useState, useEffect } from 'react'

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [contracts, setContracts] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  const authHeaders = () => {
    const token = sessionStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const loadData = async (p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, contractsRes, remindersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders() }),
        fetch(`/api/admin/contracts?page=${p}&perPage=30`, { headers: authHeaders() }),
        fetch('/api/admin/reminders', { headers: authHeaders() }),
      ])

      if (!statsRes.ok || !contractsRes.ok) {
        if (statsRes.status === 401 || contractsRes.status === 401) {
          sessionStorage.removeItem('token'); sessionStorage.removeItem('user')
          window.dispatchEvent(new Event('auth:expired'))
          throw new Error('login_required')
        }
        throw new Error('Admin access required')
      }

      const [statsData, cRes, remindersData] = await Promise.all([
        statsRes.json(), contractsRes.json(), remindersRes.json().catch(() => []),
      ])
      setStats(statsData)
      setContracts(Array.isArray(cRes) ? cRes : (cRes.data || []))
      setPagination(cRes.pagination || null)
      setReminders(Array.isArray(remindersData) ? remindersData : [])
    } catch (e) {
      if (e.message !== 'login_required') setError(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  // Client search
  const handleSearch = async (e) => {
    e?.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(search)}&perPage=30`, { headers: authHeaders() })
      const d = await res.json()
      if (res.ok) {
        // Map client search results to contract-like shape for unified table display
        setContracts(d.data.map(cl => ({
          id: cl.id,
          client_id: cl.id,
          company_name: cl.company_name,
          contact_email: cl.contact_email,
          contact_name: cl.contact_name,
          status: cl.status,
          contract_number: '（仅客户）',
          tier: '—',
          annual_fee_eur: 0,
          start_date: cl.created_at?.slice(0, 10) || '—',
          lucid_confirmed: !!cl.lucid_registration_number,
        })))
        setPagination(d.pagination)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleTriggerReminders = async () => {
    try {
      const res = await fetch('/api/admin/reminders/check', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      })
      alert(res.ok ? '提醒检查完成' : '操作失败')
      if (res.ok) loadData(page)
    } catch (e) { alert('请求失败: ' + e.message) }
  }

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/clients/export', { headers: authHeaders() })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `freddy-clients-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('导出失败: ' + e.message) }
  }

  const handleConfirmPayment = async (contractId) => {
    if (!confirm('确认该客户已完成银行转账付款？合同将自动激活。')) return
    try {
      const res = await fetch('/api/admin/payments/confirm', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      alert('✅ 付款已确认，合同已激活')
      loadData(page)
    } catch (e) { alert('❌ 操作失败: ' + e.message) }
  }

  const handleAdminUpload = async (contractId, clientId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('client_id', clientId)
      fd.append('contract_id', contractId)
      fd.append('file_type', 'admin_stamped')
      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: fd,
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      alert('✅ 盖章合同已上传')
    } catch (e) { alert('❌ 上传失败: ' + e.message) }
    e.target.value = ''
  }

  if (loading && !stats) return <div className="max-w-6xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-border rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-border/15 rounded" />)}</div></div></div>
  if (error === 'login_required') return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-bold mb-4">需要管理员登录</h1></div>
  if (error) return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-xl font-bold mb-4 text-red-600">加载失败</h1><p className="text-text2 mb-4">{error}</p><button onClick={() => loadData(page)} className="px-4 py-2 border rounded-lg text-sm">重试</button></div>
  if (!stats) return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">管理后台</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: '总客户数', value: stats.total_clients },
          { label: '活跃合同', value: stats.active_contracts },
          { label: '待付款', value: stats.pending_payments, warn: stats.pending_payments > 0 },
          { label: '年收入 (€)', value: '€' + (stats.annual_revenue_eur || 0) },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl p-5 shadow-sm border border-card">
            <p className="text-xs text-muted mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.warn ? 'text-red-600' : 'text-cyan'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Toolbar */}
      <div className="bg-card rounded-xl shadow-sm border border-card overflow-hidden mb-10">
        <div className="p-4 border-b border-card">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-2 flex-1 min-w-[300px]">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="搜索客户：公司名 / 联系人 / 邮箱" className="flex-1 border rounded-lg p-2 text-sm" />
                <button type="submit" className="px-3 py-2 bg-cyan text-white rounded-lg text-sm">搜索</button>
              </form>
              <button onClick={() => { setSearch(''); loadData(1); setPage(1) }}
                className="px-3 py-2 border rounded-lg text-sm text-text2 hover:bg-bg-light">重置</button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExport} className="px-3 py-2 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50">
                📥 导出 CSV
              </button>
              <button onClick={handleTriggerReminders} className="px-3 py-2 bg-cyan text-white rounded-lg text-sm">
                触发提醒
              </button>
            </div>
          </div>
        </div>

        {/* Contracts Table */}
        <div className="overflow-x-auto">
          {contracts.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">暂无数据</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-bg-light text-left">
                <tr>
                  <th className="p-3 font-medium">合同编号</th><th className="p-3 font-medium">公司</th>
                  <th className="p-3 font-medium">套餐</th><th className="p-3 font-medium">年费</th>
                  <th className="p-3 font-medium">状态</th><th className="p-3 font-medium">LUCID</th>
                  <th className="p-3 font-medium">起始</th>
                  <th className="p-3 font-medium w-40">操作</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-bg-light">
                    <td className="p-3 font-mono text-xs">{c.contract_number}</td>
                    <td className="p-3">{c.company_name}<br /><span className="text-xs text-muted">{c.contact_email}</span></td>
                    <td className="p-3"><span className="text-xs bg-border/15 px-2 py-0.5 rounded">{c.tier?.toUpperCase()}</span></td>
                    <td className="p-3">€{c.annual_fee_eur}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' : 'bg-border/15 text-text2'}`}>{c.status}</span></td>
                    <td className="p-3">{c.lucid_confirmed ? '✅' : '⚠️'}</td>
                    <td className="p-3 text-xs text-text2">{c.start_date}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        {c.status === 'pending_payment' && (
                          <button onClick={() => handleConfirmPayment(c.id)}
                            className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">
                            💰 确认收款
                          </button>
                        )}
                        {c.status === 'signed' && (
                          <button onClick={() => handleConfirmPayment(c.id)}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                            ✅ 确认收款
                          </button>
                        )}
                        <label className="text-xs px-2 py-1 border border-gray-300 text-text2 rounded cursor-pointer hover:bg-border/15 text-center">
                          📤 上传盖章
                          <input type="file" accept=".pdf,.doc,.docx,.jpg,.png"
                            onChange={(e) => handleAdminUpload(c.id, c.client_id, e)}
                            className="hidden" />
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-card flex justify-between items-center text-sm">
            <span className="text-text2">
              共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages} 页
            </span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                const start = Math.max(1, pagination.page - 3)
                const p = start + i
                if (p > pagination.totalPages) return null
                return (
                  <button key={p} onClick={() => { setPage(p); loadData(p) }}
                    className={`w-8 h-8 rounded text-xs font-medium ${p === pagination.page ? 'bg-cyan text-white' : 'border hover:bg-bg-light'}`}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reminders */}
      <div className="bg-card rounded-xl shadow-sm border border-card overflow-hidden">
        <div className="p-4 border-b border-card"><h2 className="font-bold">已发提醒 ({reminders.length})</h2></div>
        <div className="overflow-x-auto">
          {reminders.length === 0 ? <p className="p-8 text-center text-sm text-muted">暂无提醒记录</p> : (
            <table className="w-full text-sm">
              <thead className="bg-bg-light text-left"><tr><th className="p-3">合同</th><th className="p-3">类型</th><th className="p-3">截止日期</th><th className="p-3">状态</th></tr></thead>
              <tbody>
                {reminders.map(r => (
                  <tr key={r.id} className="border-t border-gray-50">
                    <td className="p-3 font-mono text-xs">{r.contract_number}</td>
                    <td className="p-3">{r.reminder_type === 'reporting' ? '数据申报' : '合同续期'}</td>
                    <td className="p-3">{r.due_date}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${r.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-border/15 text-text2'}`}>{r.status === 'sent' ? '已发送' : r.status}</span></td>
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
