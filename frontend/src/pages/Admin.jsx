import { useState, useEffect } from 'react'
import { PACKAGING_MATERIALS, getRecyclingRate, calcMaterialFee, applyFloorFee } from '@shared/constants.js'

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
  const [infoModal, setInfoModal] = useState(null)
  const [showPending, setShowPending] = useState(false)
  const [rateInfo, setRateInfo] = useState({ rate: 8.10, updated_at: null })
  const [rateModal, setRateModal] = useState(false)
  const [rateNew, setRateNew] = useState('')
  const [rateSubmitting, setRateSubmitting] = useState(false)

  const ah = () => { const t = sessionStorage.getItem('token'); return t ? { 'Authorization': `Bearer ${t}` } : {} }

  const fetchRate = async () => {
    try {
      const r = await fetch('/api/admin/rate', { headers: ah() })
      if (r.ok) { const d = await r.json(); setRateInfo(d) }
    } catch {}
  }

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
  const resetPassword = async (clientId) => {
    if (!confirm('确认重置该客户密码？')) return
    try {
      const r = await fetch('/api/admin/reset-password', { method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId }) })
      const d = await r.json()
      if (r.ok) alert('新密码：' + d.new_password + '\n请通知客户登录后尽快修改密码。')
      else alert('失败：' + d.error)
    } catch { alert('请求失败') }
  }

  const uploadStamped = async (e, clientId, contractId) => {
    const f = e.target.files?.[0]; if (!f) return
    const fd = new FormData(); fd.append('file', f); fd.append('client_id', clientId); fd.append('contract_id', contractId); fd.append('file_type', 'admin_stamped')
    try { const r = await fetch('/api/admin/uploads', { method: 'POST', headers: ah(), body: fd }); const d = await r.json(); if (d.success) alert('已上传'); else alert(d.error) } catch {}
    e.target.value = ''
  }

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

  useEffect(() => { load(); loadApps(); fetchRate() }, [])

  const saveRate = async () => {
    if (!rateNew) return
    setRateSubmitting(true)
    try {
      const r = await fetch('/api/admin/rate', { method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' }, body: JSON.stringify({ rate: parseFloat(rateNew) }) })
      const d = await r.json()
      if (r.ok) { setRateInfo({ rate: d.rate, updated_at: new Date().toISOString() }); setRateModal(false) }
      else alert('失败: ' + d.error)
    } catch (e) { alert('请求失败') }
    setRateSubmitting(false)
  }

  const triggerFetch = async () => {
    try {
      setRateSubmitting(true)
      const r = await fetch('/api/admin/rate/fetch', { method: 'POST', headers: ah() })
      if (r.ok) { const d = await r.json(); setRateInfo({ rate: d.rate, updated_at: new Date().toISOString() }); alert('✅ 已从 ECB 抓取最新汇率: ' + d.rate) }
      else { const d = await r.json(); alert('抓取失败: ' + d.error) }
    } catch { alert('请求失败') }
    setRateSubmitting(false)
  }

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

  const currentList = (() => {
    const list = tab === 'packaging' ? pkgContracts : tab === 'weee' ? weeeContracts : batteryContracts
    if (!showPending) return list
    return list.filter(c =>
      c.status === 'pending_payment' ||
      (c.upload_count > 0) ||
      (c.signed_at && !c._uploads?.admin_stamped?.length)
    )
  })()
  const appList = applications.filter(a => a.type === tab)
  const pendingCount = (() => {
    const list = tab === 'packaging' ? pkgContracts : tab === 'weee' ? weeeContracts : batteryContracts
    return list.filter(c =>
      c.status === 'pending_payment' ||
      (c.upload_count > 0) ||
      (c.signed_at && !c._uploads?.admin_stamped?.length)
    ).length
  })()

  if (loading && !stats) return <div className="max-w-6xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded" />)}</div></div></div>
  if (error === 'login_required') return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-extrabold mb-4">需要管理员登录</h1></div>
  if (error) return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-xl font-bold mb-4 text-red-600">加载失败</h1><p className="text-gray-400 mb-4">{error}</p><button onClick={() => load(page)} className="px-4 py-2 border rounded-md text-sm">重试</button></div>
  if (!stats) return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">项目管理</h1>
        <div className="flex items-center gap-4">
          {[{ l: '总客户', v: stats.total_clients }, { l: '活跃合同', v: stats.active_contracts }, { l: '待付款', v: stats.pending_payments, w: stats.pending_payments > 0 }, { l: '年收入 €', v: (stats.annual_revenue_eur || 0).toFixed(0) }].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5"><span className="text-xs text-gray-400">{s.l}</span><span className={`text-sm font-bold ${s.w ? 'text-red-600' : 'text-gray-700'}`}>{s.v}</span></div>
          ))}
          <button onClick={exportCSV} className="px-3 py-1.5 border border-green-300 text-green-700 rounded-md text-xs hover:bg-green-50">📥</button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
            <span className="text-xs text-amber-700">EUR/CNY</span>
            <span className="text-sm font-bold text-amber-800">{(rateInfo.rate||8.10).toFixed(2)}</span>
            <button onClick={() => { setRateModal(true); setRateNew(String(rateInfo.rate||8.10)) }} className="text-[10px] text-amber-600 hover:text-amber-800 underline">调</button>
            <button onClick={triggerFetch} disabled={rateSubmitting} className="text-[10px] text-amber-500 hover:text-amber-700" title="从 ECB 抓取">↻</button>
          </div>
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
            <div className="flex gap-2">
              <form onSubmit={async (e) => { e.preventDefault(); if(!search.trim()) return; try { const r = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(search.trim())}&perPage=30`, { headers: ah() }); const d = await r.json(); if (r.ok) { setContracts(d.data.map(cl => ({ id: cl.contract_id||cl.id, client_id: cl.id, company_name: cl.company_name, contact_email: cl.contact_email, contact_name: cl.contact_name, contact_phone: cl.contact_phone, status: cl.contract_status||cl.status, contract_number: cl.contract_number||'—', tier: cl.tier||'—', annual_fee_eur: cl.annual_fee_eur||0, start_date: cl.start_date, end_date: cl.end_date, lucid_confirmed: !!cl.lucid_confirmed, _uploads:{}, _packaging:[] }))); setPagination(d.pagination) } } catch (e) {} }} className="flex gap-2">
                <button type="button" onClick={() => setShowPending(!showPending)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${showPending ? 'bg-red-100 text-red-700 border border-red-300' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  🔔 待办 {pendingCount > 0 && `(${pendingCount})`}
                </button>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="公司 / 手机号 / 联系人 / 法人 / 合同号后4位" className="border border-gray-300 rounded-md px-3 py-2 text-sm w-72 focus:outline-none focus:border-primary" />
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium">🔍 搜索</button>
                <button type="button" onClick={() => { setSearch(''); load(1); setPage(1) }} className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-500">重置</button>
              </form>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {currentList.length === 0 ? <p className="p-8 text-center text-sm text-gray-400">暂无数据</p> : (
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col style={{width:'25%'}} /><col style={{width:'8%'}} /><col style={{width:'13%'}} /><col style={{width:'13%'}} /><col style={{width:'13%'}} /><col style={{width:'28%'}} />
              </colgroup>
              <thead className="bg-gray-200 text-left"><tr><th className="p-3 font-bold text-gray-700">基本信息</th><th className="p-3 font-bold text-gray-700">服务周期</th><th className="p-3 font-bold text-gray-700">授权代表年费</th><th className="p-3 font-bold text-gray-700">预申报费</th><th className="p-3 font-bold text-gray-700">年终结算</th><th className="p-3 font-bold text-gray-700">账户管理</th></tr></thead>
              <tbody>
                {currentList.map(c => {
                  return (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-blue-50 even:bg-blue-50/40">
                    <td className="p-3 align-top">
                      <button onClick={() => setInfoModal(c)} className="text-xs font-semibold text-primary hover:underline text-left">{c.company_name}</button>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        <span className="font-mono">{c.contract_number}</span>
                        <span className="mx-1 text-gray-300">/</span>
                        <span className="bg-gray-100 px-1 py-0.5 rounded">{c.tier?.toUpperCase()}</span>
                      </p>
                    </td>
                    <td className="p-3 align-top text-[10px]">
                      <p className="text-gray-500 leading-none mt-0">{c.start_date?.slice(0,10) || '—'}</p>
                      <p className="text-gray-500 leading-none mt-0.5">{c.end_date?.slice(0,10) || '—'}</p>
                      {c._packaging?.length > 0 && (
                        <button onClick={() => {
                          const pkg = c._packaging || []
                          const byMat = {}; pkg.forEach(item => { const mk = item.material_type || item.material_key; byMat[mk] = (byMat[mk] || 0) + (parseFloat(item.estimated_quantity_kg || item.kg) || 0) })
                          let subtotal = 0; let totalKg = 0
                          const rows = Object.entries(byMat).map(([mk, kg]) => { const mat = PACKAGING_MATERIALS.find(m => m.key === mk); const rate = mat ? getRecyclingRate(mk, kg) : 0; const fee = calcMaterialFee(mk, kg); subtotal += fee; totalKg += kg; return { label: (mat ? mat.label : mk), kg, rate, fee } })
                          const prepaidCalc = applyFloorFee(subtotal, 28.90)
                          const actByMat = {}; pkg.forEach(item => { const mk = item.material_type || item.material_key; const ak = parseFloat(item.actual_quantity_kg) || 0; if (ak > 0) actByMat[mk] = (actByMat[mk] || 0) + ak })
                          let actFee = 0; Object.entries(actByMat).forEach(([mk, kg]) => { actFee += calcMaterialFee(mk, kg) }); actFee = applyFloorFee(actFee, 28.90)
                          const hasAnyActuals = Object.keys(actByMat).length > 0
                          const rawDiff = actFee - prepaidCalc
                          const penaltyApplies = rawDiff > prepaidCalc * 0.2 && prepaidCalc > 0
                          const refundApplies = rawDiff < 0
                          const penaltyAmt = penaltyApplies ? rawDiff * 0.2 : 0
                          const refundCapped = refundApplies ? -Math.min(Math.abs(rawDiff), prepaidCalc * 0.1) : 0
                          const settleAmt = hasAnyActuals ? (penaltyApplies ? rawDiff * 1.2 : refundApplies ? refundCapped : rawDiff) : 0
                          // Build per-material settlement rows for detail table
                          const settleRows = []; const allMatKeys = new Set([...Object.keys(byMat), ...Object.keys(actByMat)]);
                          const rowByMat = {}; rows.forEach(r => { const mk2 = Object.keys(byMat).find(k => (PACKAGING_MATERIALS.find(m => m.key === k)?.label || '') === r.label); if (mk2) rowByMat[mk2] = r });
                          allMatKeys.forEach(mk => {
                            const mat = PACKAGING_MATERIALS.find(m => m.key === mk);
                            const estKg = byMat[mk] || 0, actKg = actByMat[mk] || 0;
                            const estFee = calcMaterialFee(mk, estKg), actFeeM = calcMaterialFee(mk, actKg);
                            const rate = mat ? getRecyclingRate(mk, Math.max(estKg, actKg)) : 0;
                            settleRows.push({ label: (mat ? mat.label : mk), estKg, actKg, exKg: actKg - estKg, rate, estFee, actFeeM, diff: actFeeM - estFee });
                          })
                          const e = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                          const tierName = c.tier==='basic'?'基础 €89/年':c.tier==='standard'?'标准 €159/年':'高级 €249/年'
                          const prepaidDisplay = c.prepaid_amount || prepaidCalc
                          const settleDisplay = c.settlement_amount || Math.abs(settleAmt)
                          const prepaidOverride = c.prepaid_amount > 0 && Math.abs(c.prepaid_amount - prepaidCalc) > 0.01
                          const settleOverride = c.settlement_amount > 0 && hasAnyActuals && Math.abs(c.settlement_amount - settleAmt) > 0.01
                          let html = `<html><head><meta charset="UTF-8"><title>缴费明细 - ${e(c.company_name)}</title><style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;padding:24px;max-width:960px;margin:0 auto;color:#333;font-size:13px}h2{font-size:16px;margin-bottom:4px}.sub{color:#888;font-size:12px;margin-bottom:16px}h3{font-size:13px;margin:16px 0 8px;color:#555}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:4px 8px;text-align:left}th{color:#888;font-weight:400;border-bottom:1px solid #e0e0e0}td{border-bottom:1px solid #f0f0f0}.ar{font-size:12px}.ar p{margin:3px 0}.num{text-align:right;font-variant-numeric:tabular-nums}.r{color:#c00}.g{color:#0a0}.b{font-weight:700;color:#1a3a5f}.s{text-decoration:line-through;color:#999}.y{color:#b8860b}.grid{display:grid;grid-template-columns:180px 1fr;gap:24px}.settle-section{margin-top:20px}.bank-section{margin-top:20px;padding-top:16px;border-top:2px solid #e0e0e0}.bank-section h3{font-size:12px;color:#555;margin-bottom:6px}.bank-section p{font-size:11px;color:#888;margin:2px 0;line-height:1.6}.tbl{width:100%;border-collapse:collapse;font-size:12px}.tbl th{color:#666;font-weight:500;border-bottom:2px solid #ccc;padding:5px 8px;text-align:right}.tbl th:first-child{text-align:left}.tbl td{padding:5px 8px;border-bottom:1px solid #f0f0f0;text-align:right}.tbl td:first-child{text-align:left}.tbl .total-row td{border-top:2px solid #ccc;font-weight:700}</style></head><body>`
                          html += `<h2>${e(c.company_name)}</h2><p class="sub">${e(c.contract_number)} · ${e(tierName)}</p>`
                          html += '<div class="grid">'
                          // AR
                          html += '<div class="ar"><h3>授权代表年费</h3>'
                          html += `<p><span>服务等级</span> <b>${e(tierName)}</b></p>`
                          html += `<p><span>截止日期</span> ${c.end_date?.slice(0,10)||'-'}</p>`
                          html += `<p><span>状态</span> <span class="${c.status==='active'?'g':'y'}">${c.status==='active'?'已付款':'待付款'}</span></p>`
                          html += `<p><span>金额</span> <b class="b">€${c.annual_fee_eur}</b></p></div>`
                          // Prepaid
                          html += '<div><h3>回收费预申报</h3><table>'
                          rows.forEach(r => { html += `<tr><td>${e(r.label)}</td><td class="num">${r.kg}kg</td><td class="num">€${r.rate}</td><td class="num">€${r.fee.toFixed(2)}</td></tr>` })
                          html += `<tr><td colspan="3">小计 · ${totalKg}kg</td><td class="num"><b>€${subtotal.toFixed(2)}</b></td></tr>`
                          if(prepaidCalc>subtotal) html += `<tr><td colspan="3" class="y">取起步价</td><td class="num y"><b>€${prepaidCalc.toFixed(2)}</b></td></tr>`
                          html += `</table><p class="b">预申报费 €${prepaidDisplay.toFixed(2)} ${c.prepaid_status==='paid'?'✓':''}</p>`
                          if(prepaidOverride) html += `<p class="s">报价表 €${prepaidCalc.toFixed(2)}</p>`
                          html += '</div>' // close prepaid
                          html += '</div>' // close 2-col grid
                          // ═══ Settlement — full-width detailed table ═══
                          html += '<div class="settle-section"><h3>年终结算 — 材料明细对比</h3>'
                          if(hasAnyActuals){
                            html += '<table class="tbl"><thead><tr><th>材料类别</th><th>申报量(kg)</th><th>实际量(kg)</th><th>超额(kg)</th><th>费率(€/kg)</th><th>差额(€)</th></tr></thead><tbody>'
                            settleRows.forEach(r => {
                              html += '<tr><td>'+e(r.label)+'</td><td>'+r.estKg.toFixed(1)+'</td><td>'+r.actKg.toFixed(1)+'</td>'
                              html += '<td class="'+(r.exKg>0?'r':r.exKg<0?'g':'')+'">'+(r.exKg>0?'+':'')+r.exKg.toFixed(1)+'</td>'
                              html += '<td>€'+r.rate.toFixed(4)+'</td>'
                              html += '<td class="'+(r.diff>0?'r':r.diff<0?'g':'')+'">'+(r.diff>0?'+':'')+'€'+r.diff.toFixed(2)+'</td></tr>'
                            })
                            const totalActKg = settleRows.reduce((s,r)=>s+r.actKg,0)
                            const totalExKg = settleRows.reduce((s,r)=>s+r.exKg,0)
                            const totalRawDiff2 = settleRows.reduce((s,r)=>s+r.diff,0)
                            html += '<tr class="total-row"><td><b>合计</b></td><td><b>'+totalKg.toFixed(1)+'</b></td><td><b>'+totalActKg.toFixed(1)+'</b></td>'
                            html += '<td class="'+(totalExKg>0?'r':'g')+'"><b>'+(totalExKg>0?'+':'')+totalExKg.toFixed(1)+'</b></td><td></td>'
                            html += '<td class="'+(totalRawDiff2>0?'r':'g')+'"><b>'+(totalRawDiff2>0?'+':'')+'€'+totalRawDiff2.toFixed(2)+'</b></td></tr>'
                            html += '</tbody></table>'
                            // Summary box
                            html += '<div style="margin-top:12px;padding:12px;background:#f8f9fa;border-radius:6px;font-size:12px">'
                            html += '<p>申报费总计 <b>€'+prepaidCalc.toFixed(2)+'</b> &nbsp;|&nbsp; 实际费总计 <b>€'+actFee.toFixed(2)+'</b></p>'
                            html += '<p>基础差额 <span class="'+(rawDiff>0?'r':'g')+'"><b>'+(rawDiff>0?'+':'')+'€'+rawDiff.toFixed(2)+'</b></span></p>'
                            if(penaltyApplies) html += '<p class="r">+ 惩罚金 (合同 §5(3) 20%附加费) <b>€'+penaltyAmt.toFixed(2)+'</b></p>'
                            if(refundApplies && Math.abs(rawDiff) > prepaidCalc * 0.1) html += '<p class="y">退款上限10%: 仅退 €'+Math.abs(refundCapped).toFixed(2)+'</p>'
                            html += '<p class="b" style="font-size:14px">'+(settleAmt>0?'补缴合计':'退款合计')+' €'+settleDisplay.toFixed(2)+' '+(c.settlement_status==='paid'?'✓ 已付清':'')+'</p>'
                            if(settleOverride) html += '<p class="s">公式值 €'+settleAmt.toFixed(2)+'</p>'
                            html += '</div>'
                          } else { html += '<p style="color:#999">暂无实际数据</p>' }
                          html += '</div>'
                          // ═══ Bank Info ═══
                          html += '<div class="bank-section"><h3>银行转账信息</h3>'
                          html += '<table style="font-size:11px;color:#666;line-height:1.8"><tr><td style="padding-right:20px;white-space:nowrap">开户行：</td><td>中国银行股份有限公司淮南分行</td></tr>'
                          html += '<tr><td>银行地址：</td><td>安徽省淮南市龙湖路21号</td></tr>'
                          html += '<tr><td>银行代码：</td><td>BKCHCNBJ780</td></tr>'
                          html += '<tr><td>户名：</td><td>福瑞笛（上海）信息咨询有限公司淮南分公司</td></tr>'
                          html += '<tr><td>账号：</td><td><b>181276312093</b></td></tr>'
                          html += '<tr><td>附言：</td><td>EPR-'+e(c.contract_number||'')+'</td></tr></table>'
                          html += '<p style="font-size:10px;color:#999;margin-top:6px">请在转账附言中注明合同编号，以便快速确认到账。</p></div>'
                          html += '</body></html>'
                          const w = window.open('','_blank','width=1020,height=700')
                          if(w){ w.document.write(html); w.document.close() }
                        }} className="text-[10px] text-gray-400 hover:text-primary mt-1">📊 缴费明细</button>
                      )}
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
                    <td className="p-3 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-gray-400">状态</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_CLS[c.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_MAP[c.status] || c.status}</span>
                          <span className="text-[10px] text-gray-400">LUCID</span>
                          <span className="text-[10px]">{c.lucid_confirmed ? '✅ 已授权' : '⚠️ 待授权'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => resetPassword(c.client_id)}
                            className="text-[10px] text-gray-400 hover:text-red-500">🔑 重置密码</button>
                          {c.status === 'active' && (
                            <details className="text-[10px]">
                              <summary className="cursor-pointer text-gray-500 hover:text-primary">📝 合同签署</summary>
                              <div className="mt-1 pl-2 border-l-2 border-gray-100 space-y-0.5 text-[10px] text-gray-500">
                                {c.signed_at ? (
                                  <>
                                    <p>✅ 客户已签 · {c.signed_at.slice(0,10)}</p>
                                    {(c._uploads?.signed_contract?.length > 0) && c._uploads.signed_contract.map(u => (
                                      <button key={u.id} onClick={() => authDownload(`/api/uploads/${u.id}/download`, u.original_name)}
                                        className="text-primary hover:underline">📥 下载签字合同</button>
                                    ))}
                                  </>
                                ) : <p>⏳ 待客户签</p>}
                                <label className="cursor-pointer text-primary hover:underline">
                                  📤 回签上传<input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => uploadStamped(e, c.client_id, c.id)} className="hidden" />
                                </label>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </td>
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

      {/* Client Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setInfoModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{infoModal.company_name}</h3>
              <button onClick={() => setInfoModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              {infoModal.company_name_en && <div className="flex justify-between"><span className="text-gray-400">公司（英文）</span><span className="font-medium">{infoModal.company_name_en}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">合同号</span><span className="font-mono font-medium">{infoModal.contract_number}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">套餐</span><span className="font-medium">{infoModal.tier?.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">服务周期</span><span className="font-medium">{infoModal.start_date?.slice(0,10)||'—'} – {infoModal.end_date?.slice(0,10)||'—'}</span></div>
              {infoModal.registered_address && <div className="flex justify-between"><span className="text-gray-400">注册地址</span><span className="font-medium text-xs">{infoModal.registered_address}</span></div>}
              {infoModal.uscc && <div className="flex justify-between"><span className="text-gray-400">信用代码</span><span className="font-mono font-medium">{infoModal.uscc}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">联系人</span><span className="font-medium">{infoModal.contact_name||'—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">邮箱</span><span className="font-medium">{infoModal.contact_email}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">手机</span><span className="font-medium">{infoModal.contact_phone||'—'}</span></div>
              {infoModal.wechat_id && <div className="flex justify-between"><span className="text-gray-400">微信</span><span className="font-medium">{infoModal.wechat_id}</span></div>}
              {infoModal.legal_representative && <div className="flex justify-between"><span className="text-gray-400">法定代表人</span><span className="font-medium">{infoModal.legal_representative}</span></div>}
              {infoModal.lucid_registration_number && <div className="flex justify-between"><span className="text-gray-400">LUCID号</span><span className="font-mono font-medium">{infoModal.lucid_registration_number}</span></div>}
            </div>
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setRateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">💱 设置 EUR/CNY 折算价</h3>
            <p className="text-xs text-gray-400">ECB 自动抓取 银行现汇卖出价 + 0.25。也可手动修改。<br/>上次更新: {rateInfo.updated_at ? new Date(rateInfo.updated_at).toLocaleString('zh-CN') : '—'}</p>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">CNY 折算参考价</label>
              <input type="number" step="0.01" min="0" value={rateNew} onChange={e => setRateNew(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg font-bold focus:outline-none focus:border-primary" placeholder="8.10" autoFocus />
              <p className="text-[10px] text-gray-400 mt-1">公式: ECB 中间价 × 1.015 (银行点差) + 0.25 (FREDDY)</p>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={triggerFetch} disabled={rateSubmitting} className="px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 rounded-md">🔄 从ECB抓取</button>
              <div className="flex gap-3">
                <button onClick={() => setRateModal(false)} className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-500">取消</button>
                <button onClick={saveRate} disabled={rateSubmitting || !rateNew}
                  className="px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50">
                  {rateSubmitting ? '提交中...' : '✅ 保存'}
                </button>
              </div>
            </div>
          </div>
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
