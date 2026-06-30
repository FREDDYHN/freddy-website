import { useState, useEffect } from 'react'

const TABS = [
  { key: 'packaging', label: '📦 包装法 AR' },
  { key: 'weee', label: '🔌 WEEE' },
  { key: 'battery', label: '🔋 电池法' },
]

const STATUS_MAP = { active: '已激活', pending_payment: '待付款', signed: '已签署', expired: '已过期' }
const STATUS_CLS = { active: 'bg-green-100 text-green-700', pending_payment: 'bg-yellow-100 text-yellow-700', signed: 'bg-blue-100 text-blue-700', expired: 'bg-red-100 text-red-700' }

export default function Admin() {
  const [tab, setTab] = useState('packaging')
  const [stats, setStats] = useState(null)
  const [contracts, setContracts] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [feeModal, setFeeModal] = useState(null) // { contractId, type: 'prepaid'|'settlement' }
  const [feeAmount, setFeeAmount] = useState('')
  const [feeSubmitting, setFeeSubmitting] = useState(false)
  const [search, setSearch] = useState('')


  const ah = () => { const t = sessionStorage.getItem('token'); return t ? { 'Authorization': `Bearer ${t}` } : {} }

  const load = async (p = 1) => {
    setLoading(true); setError(null)
    try {
      const [sR, cR] = await Promise.all([
        fetch('/api/admin/stats', { headers: ah() }),
        fetch(`/api/admin/contracts?page=${p}&perPage=50`, { headers: ah() }),
      ])
      if (!sR.ok) { if (sR.status === 401) { sessionStorage.removeItem('token'); window.dispatchEvent(new Event('auth:expired')); throw new Error('login_required') } throw new Error('Admin required') }
      const [s, c] = await Promise.all([sR.json(), cR.json()])
      setStats(s)
      setContracts(Array.isArray(c) ? c : (c.data || []))
      setPagination(c.pagination || null)
    } catch (e) { if (e.message !== 'login_required') setError(e.message) }
    setLoading(false)
  }

  const loadApps = async () => {
    try {
      const r = await fetch('/api/admin/applications', { headers: ah() })
      if (r.ok) { const d = await r.json(); setApplications(Array.isArray(d) ? d : (d.data || [])) }
    } catch (e) { /* optional */ }
  }

  const setRecyclingFee = async () => {
    if (!feeModal || !feeAmount) return
    setFeeSubmitting(true)
    try {
      const r = await fetch('/api/admin/set-fee', { method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' }, body: JSON.stringify({ contract_id: feeModal.contractId, fee_type: feeModal.type, amount_eur: parseFloat(feeAmount) }) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      alert(`✅ ${feeModal.type === 'prepaid' ? '回收费预缴' : '年终结算'} 费用已设置为 €${parseFloat(feeAmount).toFixed(2)}`)
      setFeeModal(null); setFeeAmount(''); load(page)
    } catch (e) { alert('❌ ' + e.message) }
    setFeeSubmitting(false)
  }

  /** Download a protected URL with admin auth token */
  const authDownload = async (url, filename) => {
    try {
      const r = await fetch(url, { headers: ah() })
      if (!r.ok) throw new Error(`下载失败 (${r.status})`)
      const blob = await r.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl; a.download = filename || ''; document.body.appendChild(a)
      a.click(); a.remove(); URL.revokeObjectURL(objUrl)
    } catch (e) { alert('❌ 下载失败: ' + e.message) }
  }

  const exportCSV = async () => { try { const r = await fetch('/api/admin/clients/export', { headers: ah() }); if (!r.ok) throw new Error('Export failed'); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `freddy-clients-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(u) } catch (e) { alert('导出失败') } }

  useEffect(() => { load(); loadApps() }, [])

  const [reviewedUploads, setReviewedUploads] = useState({})

  const reviewUpload = async (uploadId, fileType, contractId, status) => {
    try {
      const r = await fetch(`/api/admin/uploads/${uploadId}/review`, {
        method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const d = await r.json()
      if (r.ok) {
        setReviewedUploads(prev => ({ ...prev, [uploadId]: status }))
        if (status === 'approved' && (fileType === 'bank_proof' || fileType === 'proof_annual_fee')) {
          setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: 'active' } : c))
        }
      } else {
        alert('操作失败：' + (d.error || '未知错误'))
      }
    } catch (e) { alert('请求失败：' + e.message) }
  }

  /** Render upload file links for a contract's file type(s) */
  const uploadLinks = (c, ...types) => {
    const files = types.flatMap(t => c._uploads?.[t] || [])
    if (!files.length) return null
    return (
      <div className="mt-1 space-y-1">
        {files.map(u => {
          const reviewStatus = reviewedUploads[u.id] || u.status
          const isApproved = reviewStatus === 'approved'
          return (
            <div key={u.id}>
              <div className="flex items-center gap-1">
                <button onClick={() => authDownload(`/api/uploads/${u.id}/download`, u.original_name)}
                  className={`text-[10px] hover:underline text-left truncate max-w-[110px] ${isApproved ? 'text-green-600 font-medium' : 'text-blue-600'}`}
                  title={u.original_name}>
                  {isApproved ? '✅ ' : '📄 '}{(u.original_name || '').length > 14 ? (u.original_name || '').slice(0, 12) + '…' : u.original_name}
                </button>
                <button onClick={async () => { if(confirm('删除此凭证？')){ try { const r=await fetch(`/api/admin/uploads/${u.id}`,{method:'DELETE',headers:ah()}); if(r.ok) load(page) }catch{} }}}
                  className="text-[11px] text-gray-300 hover:text-red-500 flex-shrink-0 leading-none">🗑</button>
              </div>
              {reviewStatus !== 'approved' && (
                <button onClick={() => reviewUpload(u.id, u.file_type, c.id, 'approved')}
                  className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium mt-0.5">确认</button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const pkgContracts = contracts.filter(c => ['basic', 'standard', 'premium'].includes(c.tier))
  const weeeContracts = contracts.filter(c => c.tier === 'weee')
  const batteryContracts = contracts.filter(c => c.tier === 'battery')

  const currentList = tab === 'packaging' ? pkgContracts : tab === 'weee' ? weeeContracts : batteryContracts
  const appList = applications.filter(a => a.type === tab)

  if (loading && !stats) return <div className="max-w-6xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded" />)}</div></div></div>
  if (error === 'login_required') return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-extrabold mb-4">需要管理员登录</h1></div>
  if (error) return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-xl font-bold mb-4 text-red-600">加载失败</h1><p className="text-gray-400 mb-4">{error}</p><button onClick={() => load(page)} className="px-4 py-2 border rounded-md text-sm">重试</button></div>
  if (!stats) return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">管理后台</h1>
        <div className="flex items-center gap-4">
          {[{ l: '总客户', v: stats.total_clients }, { l: '活跃合同', v: stats.active_contracts }, { l: '待付款', v: stats.pending_payments, w: stats.pending_payments > 0 }, { l: '年收入 €', v: (stats.annual_revenue_eur || 0).toFixed(0) }].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5"><span className="text-xs text-gray-400">{s.l}</span><span className={`text-sm font-bold ${s.w ? 'text-red-600' : 'text-gray-700'}`}>{s.v}</span></div>
          ))}
          <button onClick={exportCSV} className="px-3 py-1.5 border border-green-300 text-green-700 rounded-md text-xs hover:bg-green-50">📥</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1) }}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-white border border-gray-200 border-b-white -mb-px text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
            {t.label}
            <span className="ml-1.5 text-xs text-gray-300">{(t.key === 'packaging' ? pkgContracts : t.key === 'weee' ? weeeContracts : batteryContracts).length + (applications.filter(a => a.type === t.key).length)}</span>
          </button>
        ))}
      </div>

      {/* Contracts Table */}
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <h2 className="font-bold text-sm text-gray-700">合同列表</h2>
            <div className="flex gap-2">
              <form onSubmit={async (e) => { e.preventDefault(); try { const r = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(search)}&perPage=30`, { headers: ah() }); const d = await r.json(); if (r.ok) { setContracts(d.data.map(cl => ({ id: cl.id, client_id: cl.id, company_name: cl.company_name, contact_email: cl.contact_email, contact_name: cl.contact_name, status: cl.status, contract_number: '（仅客户）', tier: '—', annual_fee_eur: 0, start_date: cl.created_at?.slice(0, 10) || '—', lucid_confirmed: !!cl.lucid_registration_number }))); setPagination(d.pagination) } } catch (e) {} }} className="flex gap-2">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索公司/联系人/邮箱" className="border border-gray-200 rounded-md px-3 py-2 text-sm w-60 focus:outline-none focus:border-primary" />
                <button type="submit" className="px-3 py-2 bg-primary text-white rounded-md text-sm">搜索</button>
                <button type="button" onClick={() => { setSearch(''); load(1); setPage(1) }} className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-500">重置</button>
              </form>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {currentList.length === 0 ? <p className="p-8 text-center text-sm text-gray-400">暂无数据</p> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="p-3 font-bold text-gray-700">基本信息</th><th className="p-3 font-bold text-gray-700">授权代表年费</th><th className="p-3 font-bold text-gray-700">预申报费</th><th className="p-3 font-bold text-gray-700">年终结算</th><th className="p-3 font-bold text-gray-700">状态</th><th className="p-3 font-bold text-gray-700">LUCID</th><th className="p-3 font-bold text-gray-700 w-44">操作</th></tr></thead>
              <tbody>
                {currentList.map(c => {
                  return (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="p-3 align-top">
                      <p className="text-sm font-semibold text-gray-800">{c.company_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.contact_email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.contact_name || '—'}{c.contact_phone ? ` · ${c.contact_phone}` : ''}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-mono text-[11px] text-gray-600">{c.contract_number}</span>
                        <span className="mx-1.5 text-gray-300">/</span>
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{c.tier?.toUpperCase()}</span>
                      </p>
                    </td>
                    <td className="p-3 align-top">
                      <span className={`text-xs font-semibold ${c.status === 'pending_payment' ? 'text-yellow-600' : 'text-green-600'}`}>€{c.annual_fee_eur}</span>
                      {c.status === 'pending_payment' && <span className="text-yellow-600 text-xs font-semibold ml-1">待付</span>}
                      {c.status === 'active' && <span className="text-green-600 text-xs font-semibold ml-1">✓</span>}
                      {uploadLinks(c, 'bank_proof', 'proof_annual_fee')}
                    </td>
                    <td className="p-3 align-top">
                      {c.prepaid_status === 'paid' ? (
                        <span className="text-xs text-green-600 font-medium">€{c.prepaid_amount} ✓</span>
                      ) : c.prepaid_amount ? (
                        <span className="text-xs text-yellow-600">€{c.prepaid_amount} 待付</span>
                      ) : (
                        <button onClick={() => { setFeeModal({ contractId: c.id, type: 'prepaid' }); setFeeAmount('') }}
                          className="text-xs text-primary hover:underline">💰 设置费用</button>
                      )}
                      {uploadLinks(c, 'proof_prepaid')}
                      {!uploadLinks(c, 'proof_prepaid') && (
                        <div className="mt-1"><span className="text-[10px] text-gray-300">暂无凭证</span></div>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      {c.settlement_status === 'paid' ? (
                        <span className="text-xs text-green-600 font-medium">€{c.settlement_amount} ✓</span>
                      ) : c.settlement_amount ? (
                        <span className="text-xs text-yellow-600">€{c.settlement_amount} 待付</span>
                      ) : (
                        <button onClick={() => { setFeeModal({ contractId: c.id, type: 'settlement' }); setFeeAmount('') }}
                          className="text-xs text-primary hover:underline">📋 设置结算</button>
                      )}
                      {uploadLinks(c, 'proof_settlement')}
                      {!uploadLinks(c, 'proof_settlement') && (
                        <div className="mt-1"><span className="text-[10px] text-gray-300">暂无凭证</span></div>
                      )}
                    </td>
                    <td className="p-3 align-top"><span className={`text-xs px-2 py-0.5 rounded ${STATUS_CLS[c.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_MAP[c.status] || c.status}</span></td>
                    <td className="p-3 align-top">{c.lucid_confirmed ? '✅' : '⚠️'}</td>
                    <td className="p-3 align-top"></td>
                  </tr>
                )})}
              </tbody>
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

      {/* Applications (WEEE/Battery) */}
      {appList.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h2 className="font-bold text-sm text-gray-700">申请表</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left"><tr><th className="p-3">ID</th><th className="p-3">客户</th><th className="p-3">类型</th><th className="p-3">状态</th><th className="p-3">日期</th></tr></thead>
            <tbody>{appList.map(a => <tr key={a.id} className="border-t border-gray-50"><td className="p-3 font-mono text-xs">{a.id}</td><td className="p-3">{a.company_name || '—'}</td><td className="p-3">{a.type}</td><td className="p-3"><span className="text-xs px-2 py-0.5 rounded bg-gray-100">{a.status}</span></td><td className="p-3 text-xs text-gray-400">{a.created_at?.slice(0, 10)}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {/* Fee Modal */}
      {feeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setFeeModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">{feeModal.type === 'prepaid' ? '💰 设置回收费预缴' : '📋 设置年终结算费'}</h3>
            <p className="text-xs text-gray-400">合同 #{feeModal.contractId} · 设置后将通知委托方付款</p>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">金额 (EUR)</label>
              <input type="number" step="0.01" min="0" value={feeAmount} onChange={e => setFeeAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg font-bold focus:outline-none focus:border-primary" placeholder="0.00" autoFocus />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setFeeModal(null)} className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-500">取消</button>
              <button onClick={setRecyclingFee} disabled={feeSubmitting || !feeAmount}
                className="px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50">
                {feeSubmitting ? '提交中...' : '✅ 确认设置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
