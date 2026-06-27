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

  const ah = () => { const t = sessionStorage.getItem('token'); return t ? { 'Authorization': `Bearer ${t}` } : {} }

  const load = async (p = 1) => {
    setLoading(true); setError(null)
    try {
      const [sR, cR, rR] = await Promise.all([fetch('/api/admin/stats', { headers: ah() }), fetch(`/api/admin/contracts?page=${p}&perPage=30`, { headers: ah() }), fetch('/api/admin/reminders', { headers: ah() })])
      if (!sR.ok || !cR.ok) { if (sR.status === 401 || cR.status === 401) { sessionStorage.removeItem('token'); sessionStorage.removeItem('user'); window.dispatchEvent(new Event('auth:expired')); throw new Error('login_required') } throw new Error('Admin required') }
      const [s, c, r] = await Promise.all([sR.json(), cR.json(), rR.json().catch(() => [])])
      setStats(s); setContracts(Array.isArray(c) ? c : (c.data || [])); setPagination(c.pagination || null); setReminders(Array.isArray(r) ? r : [])
    } catch (e) { if (e.message !== 'login_required') setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const searchClients = async (e) => {
    e?.preventDefault(); setLoading(true)
    try {
      const r = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(search)}&perPage=30`, { headers: ah() }); const d = await r.json()
      if (r.ok) { setContracts(d.data.map(cl => ({ id: cl.id, client_id: cl.id, company_name: cl.company_name, contact_email: cl.contact_email, contact_name: cl.contact_name, status: cl.status, contract_number: '（仅客户）', tier: '—', annual_fee_eur: 0, start_date: cl.created_at?.slice(0, 10) || '—', lucid_confirmed: !!cl.lucid_registration_number }))); setPagination(d.pagination) }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const confirmPay = async (id) => { if (!confirm('确认该客户已完成银行转账？合同将自动激活。')) return; try { const r = await fetch('/api/admin/payments/confirm', { method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' }, body: JSON.stringify({ contract_id: id }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); alert('✅ 已确认，合同已激活'); load(page) } catch (e) { alert('❌ ' + e.message) } }
  const adminUp = async (cid, clid, e) => { const f = e.target.files?.[0]; if (!f) return; try { const fd = new FormData(); fd.append('file', f); fd.append('client_id', clid); fd.append('contract_id', cid); fd.append('file_type', 'admin_stamped'); const r = await fetch('/api/admin/uploads', { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }, body: fd }); const d = await r.json(); if (!r.ok) throw new Error(d.error); alert('✅ 盖章合同已上传') } catch (e) { alert('❌ ' + e.message) }; e.target.value = '' }
  const exportCSV = async () => { try { const r = await fetch('/api/admin/clients/export', { headers: ah() }); if (!r.ok) throw new Error('Export failed'); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `freddy-clients-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(u) } catch (e) { alert('导出失败') } }
  const trigRemind = async () => { try { const r = await fetch('/api/admin/reminders/check', { method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' } }); alert(r.ok ? '提醒检查完成' : '操作失败'); if (r.ok) load(page) } catch (e) { alert('请求失败') } }

  if (loading && !stats) return <div className="max-w-6xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded" />)}</div></div></div>
  if (error === 'login_required') return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-extrabold mb-4">需要管理员登录</h1></div>
  if (error) return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-xl font-bold mb-4 text-red-600">加载失败</h1><p className="text-gray-400 mb-4">{error}</p><button onClick={() => load(page)} className="px-4 py-2 border rounded-md text-sm">重试</button></div>
  if (!stats) return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold mb-8">管理后台</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[{ l: '总客户数', v: stats.total_clients }, { l: '活跃合同', v: stats.active_contracts }, { l: '待付款', v: stats.pending_payments, w: stats.pending_payments > 0 }, { l: '年收入 (€)', v: '€' + (stats.annual_revenue_eur || 0) }].map((s, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-lg p-4"><p className="text-xs text-gray-400 mb-1">{s.l}</p><p className={`text-2xl font-bold ${s.w ? 'text-red-600' : 'text-primary'}`}>{s.v}</p></div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-2 flex-1 min-w-[280px]">
              <form onSubmit={searchClients} className="flex gap-2 flex-1">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索：公司名 / 联系人 / 邮箱" className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                <button type="submit" className="px-3 py-2 bg-primary text-white rounded-md text-sm font-medium">搜索</button>
              </form>
              <button onClick={() => { setSearch(''); load(1); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-gray-50">重置</button>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="px-3 py-2 border border-green-300 text-green-700 rounded-md text-sm hover:bg-green-50">📥 导出 CSV</button>
              <button onClick={trigRemind} className="px-3 py-2 bg-primary text-white rounded-md text-sm font-medium">触发提醒</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {contracts.length === 0 ? <p className="p-8 text-center text-sm text-gray-400">暂无数据</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="p-3 font-medium">合同编号</th><th className="p-3 font-medium">公司</th><th className="p-3 font-medium">套餐</th><th className="p-3 font-medium">年费</th><th className="p-3 font-medium">状态</th><th className="p-3 font-medium">LUCID</th><th className="p-3 font-medium">起始</th><th className="p-3 font-medium w-36">操作</th></tr></thead>
              <tbody>{contracts.map(c => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{c.contract_number}</td>
                  <td className="p-3">{c.company_name}<br /><span className="text-xs text-gray-400">{c.contact_email}</span></td>
                  <td className="p-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.tier?.toUpperCase()}</span></td>
                  <td className="p-3">€{c.annual_fee_eur}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span></td>
                  <td className="p-3">{c.lucid_confirmed ? '✅' : '⚠️'}</td>
                  <td className="p-3 text-xs text-gray-400">{c.start_date}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      {(c.status === 'pending_payment' || c.status === 'signed') && <button onClick={() => confirmPay(c.id)} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">💰 确认收款</button>}
                      <label className="text-xs px-2 py-1 border border-gray-200 text-gray-500 rounded cursor-pointer hover:bg-gray-100 text-center">📤 上传盖章<input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => adminUp(c.id, c.client_id, e)} className="hidden" /></label>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center text-sm">
            <span className="text-gray-400">共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages} 页</span>
            <div className="flex gap-1">{Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => { const st = Math.max(1, pagination.page - 3); const p = st + i; if (p > pagination.totalPages) return null; return <button key={p} onClick={() => { setPage(p); load(p) }} className={`w-8 h-8 rounded text-xs font-medium ${p === pagination.page ? 'bg-primary text-white' : 'border hover:bg-gray-50'}`}>{p}</button> })}</div>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h2 className="font-bold">已发提醒 ({reminders.length})</h2></div>
        <div className="overflow-x-auto">
          {reminders.length === 0 ? <p className="p-8 text-center text-sm text-gray-400">暂无提醒记录</p> : (
            <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-3">合同</th><th className="p-3">类型</th><th className="p-3">截止日期</th><th className="p-3">状态</th></tr></thead>
              <tbody>{reminders.map(r => <tr key={r.id} className="border-t border-gray-50"><td className="p-3 font-mono text-xs">{r.contract_number}</td><td className="p-3">{r.reminder_type === 'reporting' ? '数据申报' : '合同续期'}</td><td className="p-3">{r.due_date}</td><td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${r.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.status === 'sent' ? '已发送' : r.status}</span></td></tr>)}</tbody></table>
          )}
        </div>
      </div>
    </div>
  )
}
