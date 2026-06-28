import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { REPORTING_DEADLINE_MONTH, REPORTING_DEADLINE_DAY } from '@shared/constants.js'

const TIER_LABELS = { basic: '基础套餐 / BASIC', standard: '标准套餐 / STANDARD', premium: '高级套餐 / PREMIUM', weee: 'WEEE 合规', battery: '电池法 合规' }
function tierLabel(t) { return TIER_LABELS[t] || t?.toUpperCase() || '' }

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [bankInfo, setBankInfo] = useState(null)
  const [genMsg, setGenMsg] = useState('')

  function authHeaders() {
    const t = sessionStorage.getItem('token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) { setError('login_required'); setLoading(false); return }
    const h = authHeaders()
    Promise.all([fetch('/api/dashboard', { headers: h }), fetch('/api/uploads', { headers: h }), fetch('/api/bank-info')])
      .then(async ([dR, uR, bR]) => {
        if (!dR.ok) { if (dR.status === 401) { window.dispatchEvent(new Event('auth:expired')); throw new Error('login_required') } throw new Error('Server error') }
        const [d, u, b] = await Promise.all([dR.json(), uR.json(), bR.json()])
        if (d.success) setData(d.data); if (u.success) setUploads(u.data); setBankInfo(b)
      }).catch(e => { if (e.message !== 'login_required') setError(e.message) }).finally(() => setLoading(false))
  }, [])

  const handleGen = async (id, tier) => {
    setGenerating(id); setGenMsg('')
    try {
      // Check if contract was already generated during signup (passed via sessionStorage)
      const pendingUrl = sessionStorage.getItem('pending_download')
      const pendingNo = sessionStorage.getItem('pending_contract_no')
      if (pendingUrl) {
        sessionStorage.removeItem('pending_download')
        sessionStorage.removeItem('pending_contract_no')
        setGenMsg(`✅ 合同已生成: ${pendingNo || ''}`)
        window.open(pendingUrl, '_blank')
        setGenerating(null)
        return
      }

      // Fallback: call generate endpoint for old contracts without pre-generated URL
      const gt = tier === 'weee' ? 'weee' : tier === 'battery' ? 'battery' : 'ar'
      const token = sessionStorage.getItem('token')
      if (!token) throw new Error('未登录，请重新登录')
      const r = await fetch(`/api/contracts/${id}/generate`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: gt, client_location: 'cn' }) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      setGenMsg(`✅ 合同已生成: ${d.contract_number}`); window.open(d.download_url, '_blank')
    } catch (e) { setGenMsg('❌ ' + e.message) }
    setGenerating(null)
  }

  const handleUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', f); fd.append('file_type', 'signed_contract')
      if (data?.contracts?.[0]?.id) fd.append('contract_id', data.contracts[0].id)
      const token = sessionStorage.getItem('token')
      if (!token) { alert('未登录，请重新登录'); return }
      const r = await fetch('/api/uploads', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      setUploads(p => [d.file, ...p]); alert('✅ 文件上传成功')
    } catch (e) { alert('❌ 上传失败: ' + e.message) }
    setUploading(false); e.target.value = ''
  }

  if (error === 'login_required') return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-extrabold mb-4">请先登录</h1><p className="text-gray-400 mb-6">登录后查看合规面板</p><Link to="/login" className="inline-block px-6 py-2.5 bg-primary text-white rounded-md text-sm font-semibold">前往登录 →</Link></div>
  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-48" /><div className="h-32 bg-gray-100 rounded" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded" />)}</div></div></div>
  if (error) return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><div className="text-4xl mb-4">⚠️</div><h1 className="text-xl font-bold mb-2">加载失败</h1><p className="text-gray-400 mb-4">{error}</p><button onClick={() => window.location.reload()} className="px-4 py-2 border rounded-md text-sm">重试</button></div>
  if (!data?.contracts?.length) return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-extrabold mb-4">暂无合同</h1><p className="text-gray-400 mb-6">请先 <Link to="/signup" className="text-primary underline font-medium">在线签约</Link></p></div>

  const c = data.contracts[0]; const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date) - now) / 86400000))
  const reportYear = now.getMonth() < (REPORTING_DEADLINE_MONTH - 1) ? now.getFullYear() : now.getFullYear() + 1
  const daysToReport = Math.ceil((new Date(reportYear, REPORTING_DEADLINE_MONTH - 1, REPORTING_DEADLINE_DAY) - now) / 86400000)
  const sc = { active: 'bg-green-100 text-green-700', pending_payment: 'bg-yellow-100 text-yellow-700', signed: 'bg-blue-100 text-blue-700', expired: 'bg-red-100 text-red-700' }
  const sl = { active: '已激活', pending_payment: '待付款', signed: '已签署', expired: '已过期' }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between mb-8">
        <div><h1 className="text-2xl font-extrabold">我的合规面板</h1><p className="text-sm text-gray-400">{data.client.company_name}</p></div>
        <div className="flex gap-2"><Link to="/profile" className="px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50">✏️ 编辑资料</Link><span className={`px-3 py-1 rounded-md text-sm font-medium ${sc[c.status] || ''}`}>{sl[c.status] || c.status}</span></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[{ l: '合同编号', v: c.contract_number, s: tierLabel(c.tier) }, { l: '年费', v: '€' + c.annual_fee_eur, s: '含AR服务' }, { l: '合同剩余', v: daysLeft + ' 天', s: c.end_date, w: daysLeft < 60 }, { l: '距申报截止', v: daysToReport + ' 天', s: `${reportYear}-${String(REPORTING_DEADLINE_MONTH).padStart(2, '0')}-${String(REPORTING_DEADLINE_DAY).padStart(2, '0')}`, w: daysToReport < 45 }].map((s, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">{s.l}</p>
            <p className={`text-xl font-bold ${s.w ? 'text-red-600' : 'text-primary'}`}>{s.v}</p>
            <p className="text-xs text-gray-400">{s.s}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-lg p-4 mb-6 border ${c.lucid_confirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3"><span className="text-xl">{c.lucid_confirmed ? '✅' : '⚠️'}</span><div><h3 className="font-bold text-sm">{c.lucid_confirmed ? 'LUCID 已确认' : 'LUCID 待确认'}</h3><p className="text-xs text-gray-500">{c.lucid_confirmed ? '合规已生效' : '请在LUCID中将 LIVANTO GmbH 指定为授权代表'}</p></div></div>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-5 mb-6">
        <h3 className="font-bold mb-4">📄 合同管理</h3>
        <div className="flex flex-wrap gap-3 mb-3">
          <button onClick={() => handleGen(c.id, c.tier)} disabled={generating === c.id} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50">{generating === c.id ? '生成中...' : '📥 生成并下载合同'}</button>
          <label className={`px-4 py-2 border border-gray-200 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-50 ${uploading ? 'opacity-50' : ''}`}>{uploading ? '上传中...' : '📤 上传签字盖章合同'}<input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleUpload} disabled={uploading} className="hidden" /></label>
        </div>
        {genMsg && <p className={`text-xs ${genMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{genMsg}</p>}
        {uploads.length > 0 && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs font-medium mb-2">已上传文件</p>
            <div className="space-y-1.5">{uploads.map(f => <div key={f.stored_path} className="flex justify-between items-center text-xs bg-gray-50 rounded px-3 py-2"><span>{f.original_name}</span><span className="text-gray-400">{new Date(f.uploaded_at).toLocaleDateString('zh-CN')}</span><a href={`/api/uploads/${f.id || '0'}/download`} className="text-primary font-medium">下载</a></div>)}</div>
          </div>
        )}
      </div>

      {c.status === 'pending_payment' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-center">
          <p className="text-xs text-yellow-700 mb-2">📌 完成银行转账后点击下方按钮通知管理员确认</p>
          <button onClick={async () => { if (!confirm('确认已完成银行转账？')) return; try { const r = await fetch('/api/payments/notify', { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ contract_id: c.id }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); alert('✅ 已通知管理员'); window.location.reload() } catch (e) { alert('❌ ' + e.message) } }} className="px-5 py-2 bg-yellow-500 text-white rounded-md text-sm font-semibold hover:bg-yellow-600">💰 我已完成银行转账</button>
        </div>
      )}

      {c.status === 'pending_payment' && bankInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
          <h3 className="font-bold text-sm mb-2">💳 银行转账付款信息</h3>
          <div className="grid md:grid-cols-2 gap-2 text-xs"><div><span className="text-gray-400">银行：</span>{bankInfo.bank_name}</div><div><span className="text-gray-400">账户名：</span>{bankInfo.account_name}</div><div><span className="text-gray-400">账号：</span>{bankInfo.account_number}</div><div><span className="text-gray-400">SWIFT：</span>{bankInfo.swift}</div></div>
          <p className="text-xs text-blue-600 mt-2">💡 备注 "{bankInfo.reference_prefix}{c.contract_number}"</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <h3 className="font-bold text-sm mb-3">包装申报 ({data.packaging.length} 种)</h3>
          {data.packaging.length === 0 ? <p className="text-xs text-gray-400">暂无数据</p> : data.packaging.map(p => <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-gray-50"><span>{p.material_type}</span><span className="text-gray-400">{p.packaging_category}</span><span className="font-medium">{p.estimated_quantity_kg} kg</span></div>)}
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <h3 className="font-bold text-sm mb-3">支付记录</h3>
          {data.payments.length === 0 ? <p className="text-xs text-gray-400">暂无记录</p> : data.payments.map(p => <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-gray-50"><span>¥{p.amount_cny}</span><span className={`px-1.5 py-0.5 rounded text-[11px] ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status === 'paid' ? '已付' : '待付'}</span></div>)}
          {data.invoices.map(inv => <div key={inv.id} className="flex justify-between text-xs mt-2 pt-2 border-t border-gray-100"><span className="text-gray-400">发票 {inv.invoice_number}</span><span>€{inv.amount_eur}</span><span className="text-green-600">{inv.status === 'issued' ? '已开具' : inv.status}</span></div>)}
        </div>
      </div>
    </div>
  )
}
