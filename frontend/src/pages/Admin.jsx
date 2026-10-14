import { useState, useEffect } from 'react'
import { PACKAGING_MATERIALS, getRecyclingRate, calcMaterialFee, applyFloorFee, CLIENT_CHANGEABLE_FIELDS, CLIENT_COUNTRIES } from '@shared/constants.js'

const TABS = [
  { key: 'packaging', label: '📦 包装法 AR' },
  { key: 'weee', label: '🔌 WEEE' },
  { key: 'battery', label: '🔋 电池法' },
]

const STATUS_MAP = { active: '已激活', pending_payment: '待付款', pending_verification: '待验证', signed: '已签署', expired: '已过期', terminated: '已终止' }
const STATUS_CLS = { active: 'bg-green-100 text-green-700', pending_payment: 'bg-yellow-100 text-yellow-700', pending_verification: 'bg-gray-100 text-gray-500', signed: 'bg-blue-100 text-blue-700', expired: 'bg-red-100 text-red-700', terminated: 'bg-gray-100 text-gray-500' }
// 状态下拉：待付款/已签署
const FILTER_OPTIONS = [
  { value: 'unpaid', label: '待付款', countKey: 'unpaid_clients' },
  { value: 'signed_waiting', label: '已签署', countKey: 'signed_waiting_clients' },
]

/** 回收费人民币展示：优先用锁定 amount_cny，否则用锁定汇率/实时汇率折算（约值取整） */
function feeCnyDisplay(cny, rate, eur, liveRate) {
  if (Number(cny) > 0) return Math.round(Number(cny))
  const r = rate || liveRate || 8.10
  return Math.round((Number(eur) || 0) * r)
}

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
  const [pendingFilter, setPendingFilter] = useState('')  // ''=不筛 | stamp | proof | sync | info_change
  const [statusFilter, setStatusFilter] = useState('')
  const [rateInfo, setRateInfo] = useState({ rate: 8.10, updated_at: null })
  const [bankInfo, setBankInfo] = useState(null)
  const [feeDetailHtml, setFeeDetailHtml] = useState(null)
  const [rateModal, setRateModal] = useState(false)
  const [rateNew, setRateNew] = useState('')
  const [rateSubmitting, setRateSubmitting] = useState(false)
  const [revenueOpen, setRevenueOpen] = useState(false)
  const [pendingOpen, setPendingOpen] = useState(false)
  const [infoChangeOpen, setInfoChangeOpen] = useState(false)
  const [lucidPwd, setLucidPwd] = useState(null)
  const [lucidEdit, setLucidEdit] = useState('')
  const [lucidSaveMsg, setLucidSaveMsg] = useState('')
  const [taxEdit, setTaxEdit] = useState(null)
  const [taxSaveMsg, setTaxSaveMsg] = useState('')

  const ah = () => { const t = sessionStorage.getItem('token'); return t ? { 'Authorization': `Bearer ${t}` } : {} }

  const fetchRate = async () => {
    try {
      const r = await fetch('/api/admin/rate', { headers: ah() })
      if (r.ok) { const d = await r.json(); setRateInfo(d) }
    } catch {}
  }

  const fetchBankInfo = async () => {
    try {
      const r = await fetch('/api/bank-info')
      if (r.ok) { const d = await r.json(); setBankInfo(d || {}) }
    } catch {}
  }

  const showLucidPassword = async (clientId) => {
    setLucidPwd(null)
    try {
      const r = await fetch(`/api/admin/clients/${clientId}/lucid-password`, { headers: ah() })
      if (r.ok) { const d = await r.json(); setLucidPwd(d.password ?? '') }
      else { const d = await r.json().catch(() => ({})); alert(d.error || '获取失败') }
    } catch { alert('网络错误') }
  }

  const saveLucidNumber = async () => {
    if (!infoModal) return
    const val = lucidEdit.trim()
    if (!val) { setLucidSaveMsg('❌ 请输入 LUCID 注册号'); return }
    try {
      const r = await fetch(`/api/admin/clients/${infoModal.client_id}/lucid`, { method: 'PATCH', headers: { ...ah(), 'Content-Type': 'application/json' }, body: JSON.stringify({ lucid_registration_number: val }) })
      const d = await r.json()
      if (r.ok) {
        setLucidSaveMsg('✅ 已保存')
        setInfoModal({ ...infoModal, lucid_registration_number: val })
        setContracts(prev => prev.map(c => c.client_id === infoModal.client_id ? { ...c, lucid_registration_number: val } : c))
      } else setLucidSaveMsg('❌ ' + (d.error || '保存失败'))
    } catch (e) { setLucidSaveMsg('❌ ' + e.message) }
  }

  const saveAdminTax = async () => {
    if (!infoModal || !taxEdit) return
    const cid = infoModal.client_id
    try {
      const r = await fetch(`/api/admin/clients/${cid}`, { method: 'PATCH', headers: { ...ah(), 'Content-Type': 'application/json' }, body: JSON.stringify(taxEdit) })
      const d = await r.json()
      if (r.ok) {
        setTaxSaveMsg('✅ 已保存')
        setInfoModal({ ...infoModal, entity_type: d.entity_type, uscc: d.uscc, id_number: d.id_number })
        setContracts(prev => prev.map(c => c.client_id === cid ? { ...c, entity_type: d.entity_type, uscc: d.uscc, id_number: d.id_number } : c))
      } else setTaxSaveMsg('❌ ' + (d.error || '保存失败'))
    } catch (e) { setTaxSaveMsg('❌ ' + e.message) }
  }

  const load = async (p = 1, includeAll = false, perPage = 10) => {
    setLoading(true); setError(null)
    try {
      const incParam = includeAll ? '&include=all' : ''
      const [sR, cR] = await Promise.all([
        fetch('/api/admin/stats', { headers: ah() }),
        fetch(`/api/admin/contracts?page=${p}&perPage=${perPage}${incParam}`, { headers: ah() }),
      ])
      if (!sR.ok) { if (sR.status === 401) { sessionStorage.removeItem('token'); window.dispatchEvent(new Event('auth:expired')); throw new Error('login_required') } throw new Error('Admin required') }
      const [s, c] = await Promise.all([sR.json(), cR.json()])
      setStats(s)
      setContracts(Array.isArray(c) ? c : (c.data || []))
      setPagination(c.pagination || null)
    } catch (e) { if (e.message !== 'login_required') setError(e.message) }
    setLoading(false)
  }

  // 变更后重载：保留当前筛选（有筛选时一次加载全部，否则默认分页）
  const reload = () => {
    const needAll = statusFilter || (pendingFilter && pendingFilter !== 'info_change')
    load(page, false, needAll ? 1000 : 10)
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
      setFeeModal(null); setFeeAmount(''); reload()
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
    try { const r = await fetch('/api/admin/uploads', { method: 'POST', headers: ah(), body: fd }); const d = await r.json(); if (d.success) { alert('已上传'); reload() } else alert(d.error) } catch {}
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

  const toggleSpam = async (contractId) => {
    try {
      const r = await fetch(`/api/admin/contracts/${contractId}/spam`, { method: 'POST', headers: ah() })
      if (r.ok) { const d = await r.json(); setContracts(prev => prev.map(c => c.id === contractId ? { ...c, is_spam: d.is_spam ? 1 : 0 } : c)) }
    } catch {}
  }

  const toggleLucidAnnehmen = async (contractId, current) => {
    const action = current ? '取消「LIVANTO 已接受」标记' : '标记为「LIVANTO 已在 LUCID 中接受」'
    if (!confirm(`确认${action}？`)) return
    try {
      const r = await fetch(`/api/admin/contracts/${contractId}/lucid-annehmen`, { method: 'POST', headers: ah() })
      const d = await r.json()
      if (r.ok) setContracts(prev => prev.map(c => c.id === contractId ? { ...c, lucid_rep_accepted: d.lucid_rep_accepted ? 1 : 0 } : c))
      else alert('❌ ' + (d.error || '操作失败'))
    } catch (e) { alert('❌ ' + e.message) }
  }

  const deleteContract = async (contractId) => {
    if (!confirm('⚠️ 确认删除此合同？合同相关的所有支付、上传、通知记录将一并删除。此操作不可撤销！')) return
    try {
      const r = await fetch(`/api/admin/contracts/${contractId}`, { method: 'DELETE', headers: ah() })
      if (r.ok) { setContracts(prev => prev.filter(c => c.id !== contractId)); reload() }
      else { const d = await r.json(); alert('删除失败: ' + d.error) }
    } catch { alert('请求失败') }
  }

  const deleteClient = async (clientId) => {
    if (!confirm('⚠️ 确认删除此账户？将永久删除该客户的合同、联系方式、登录账号及全部关联数据（支付/上传/通知等），邮箱和电话将释放并可重新注册。此操作不可撤销！')) return
    try {
      const r = await fetch(`/api/admin/clients/${clientId}`, { method: 'DELETE', headers: ah() })
      if (r.ok) { setContracts(prev => prev.filter(c => c.client_id !== clientId)); reload() }
      else { const d = await r.json(); alert('删除失败: ' + d.error) }
    } catch { alert('请求失败') }
  }

  const deleteApplication = async (appId) => {
    if (!confirm('确认删除此申请表？')) return
    try {
      const r = await fetch(`/api/admin/applications/${appId}`, { method: 'DELETE', headers: ah() })
      if (r.ok) { setApplications(prev => prev.filter(a => a.id !== appId)) }
      else { const d = await r.json(); alert('删除失败: ' + d.error) }
    } catch { alert('请求失败') }
  }

  const reviewApplication = async (appId, action) => {
    let comment = ''
    if (action === 'reject') {
      const c = window.prompt('拒绝原因（可留空）：')
      if (c === null) return
      comment = c
    }
    try {
      const r = await fetch(`/api/admin/applications/${appId}/review`, {
        method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment }),
      })
      const d = await r.json()
      if (r.ok) {
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: action === 'approve' ? 'approved' : 'rejected' } : a))
        reload()
      } else alert('操作失败：' + (d.error || '未知错误'))
    } catch (e) { alert('请求失败：' + e.message) }
  }

  const renderChanges = (a) => {
    let changes = {}
    try { changes = (JSON.parse(a.data_json || '{}') || {}).changes || {} } catch {}
    const entries = Object.entries(changes)
    if (!entries.length) return <span className="text-gray-400">—</span>
    return (
      <div className="space-y-0.5">
        {entries.map(([field, val]) => {
          const old = a[field]
          return (
            <div key={field}>
              {CLIENT_CHANGEABLE_FIELDS[field] || field}：
              {old ? <span className="text-gray-400 line-through">{old}</span> : <span className="text-gray-300">（空）</span>}
              <span className="mx-1">→</span>
              <span className="font-medium">{val}</span>
            </div>
          )
        })}
      </div>
    )
  }

  useEffect(() => { load(); loadApps(); fetchRate(); fetchBankInfo() }, [])

  useEffect(() => {
    if (infoModal) { setLucidEdit(infoModal.lucid_registration_number || ''); setLucidSaveMsg('') }
  }, [infoModal])

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

  const reviewUpload = async (uploadId, fileType, contractId, status, action) => {
    try {
      const r = await fetch(`/api/admin/uploads/${uploadId}/review`, {
        method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify(action ? { status, action } : { status }),
      })
      const d = await r.json()
      if (r.ok) {
        setReviewedUploads(prev => ({ ...prev, [uploadId]: status }))
        // 后端可能按 action（collect/self_declared）改写 file_type 并调整 pre_declared_status，
        // 刷新以正确归类凭证，避免「确认自行预申报」后凭证从表格消失
        reload()
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
                <button onClick={async () => { if(confirm('删除此凭证？')){ try { const r=await fetch(`/api/admin/uploads/${u.id}`,{method:'DELETE',headers:ah()}); if(r.ok) reload() }catch{} }}}
                  className="text-[11px] text-gray-300 hover:text-red-500 flex-shrink-0 leading-none">🗑</button>
              </div>
              {reviewStatus !== 'approved' && (
                (u.file_type === 'proof_prepaid' || u.file_type === 'proof_predeclared') ? (
                  <>
                    <button onClick={() => reviewUpload(u.id, u.file_type, c.id, 'approved', 'collect')}
                      className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium mt-0.5">确认代收</button>
                    <button onClick={() => reviewUpload(u.id, u.file_type, c.id, 'approved', 'self_declared')}
                      className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium mt-0.5 ml-1">确认自行预申报</button>
                  </>
                ) : (
                  <button onClick={() => reviewUpload(u.id, u.file_type, c.id, 'approved')}
                    className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium mt-0.5">确认</button>
                )
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
    let list = tab === 'packaging' ? pkgContracts : tab === 'weee' ? weeeContracts : batteryContracts
    // Status filter (dropdown) — 'signed'/'expired' 不是真实 status，改用 signed_at / end_date 判断
    if (statusFilter === 'unpaid') {
      // 待付款：已上传签章合同 + 有未缴年费(status≠active)或预申报费(prepaid_status=pending)
      list = list.filter(c => {
        const hasSigned = (c._uploads?.signed_contract || []).some(u => u.status !== 'rejected')
        const unpaid = c.status === 'pending_payment' || c.status === 'signed' || c.prepaid_status === 'pending'
        return hasSigned && unpaid
      })
    } else if (statusFilter === 'signed_waiting') {
      // 已签署：客户上传签章合同 + 管理员未回签(无 admin_stamped)
      list = list.filter(c => {
        const hasSigned = (c._uploads?.signed_contract || []).some(u => u.status !== 'rejected')
        const hasStamped = (c._uploads?.admin_stamped || []).length > 0
        return hasSigned && !hasStamped
      })
    }
    // 待办筛选（待回签 / 待审凭证 / 未同步）
    if (pendingFilter === 'stamp' || pendingFilter === 'proof' || pendingFilter === 'sync') {
      const PROOF_TYPES = ['bank_proof', 'proof_annual_fee', 'proof_prepaid', 'proof_predeclared', 'proof_settlement', 'proof_previous_year', 'payment_proof']
      list = list.filter(c => {
        const hasPendingProof = Object.entries(c._uploads || {}).some(([ft, ups]) => PROOF_TYPES.includes(ft) && (ups || []).some(u => u.status === 'pending'))
        const needsStamp = (c._uploads?.signed_contract || []).some(u => u.status !== 'rejected') && !(c._uploads?.admin_stamped || []).length
        const needsSync = !c.lucid_rep_accepted && c.status !== 'terminated'
        if (pendingFilter === 'stamp') return needsStamp
        if (pendingFilter === 'proof') return hasPendingProof
        if (pendingFilter === 'sync') return needsSync
      })
    }
    return list
  })()
  const appList = applications.filter(a => a.type === tab)
  const infoChangeApps = applications
    .filter(a => a.type === 'info_change')
    .sort((a, b) => {
      // 待处理(pending)置顶；其余按时间倒序（新→旧）
      const pa = a.status === 'pending' ? 0 : 1
      const pb = b.status === 'pending' ? 0 : 1
      if (pa !== pb) return pa - pb
      return String(b.created_at || '').localeCompare(String(a.created_at || ''))
    })
  const pendingCount = (Number(stats?.pending_clients) || 0) + infoChangeApps.filter(a => a.status === 'pending').length

  if (loading && !stats) return <div className="max-w-6xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded" />)}</div></div></div>
  if (error === 'login_required') return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-extrabold mb-4">需要管理员登录</h1></div>
  if (error) return <div className="max-w-6xl mx-auto px-4 py-16 text-center"><h1 className="text-xl font-bold mb-4 text-red-600">加载失败</h1><p className="text-gray-400 mb-4">{error}</p><button onClick={() => reload()} className="px-4 py-2 border rounded-md text-sm">重试</button></div>
  if (!stats) return null

  const arCny = Math.round(Number(stats.ar_fee_cny) || 0)
  const preCny = Math.round(Number(stats.predeclared_fee_cny) || 0)
  const settleCny = Math.round(Number(stats.settlement_fee_cny) || 0)
  const revenueTotal = arCny + preCny + settleCny
  const arClients = Number(stats.ar_fee_clients) || 0
  const preClients = Number(stats.predeclared_fee_clients) || 0
  const settleClients = Number(stats.settlement_fee_clients) || 0

  const pendingAr = Number(stats.pending_ar) || 0
  const pendingPre = Number(stats.pending_pre) || 0
  const pendingSettle = Number(stats.pending_settle) || 0
  const pendingTotal = pendingAr + pendingPre
  const pendingArCny = Math.round(Number(stats.pending_ar_cny) || 0)
  const pendingPreCny = Math.round(Number(stats.pending_pre_cny) || 0)
  const pendingSettleCny = Math.round(Number(stats.pending_settle_cny) || 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800 whitespace-nowrap">项目管理</h1>
        <div className="flex items-center gap-4 flex-wrap">
          {[{ l: '总客户', v: stats.total_clients }, { l: 'LUCID同步', v: stats.lucid_synced }].map((s, i) => (
            <div key={i} className="flex flex-col items-center leading-tight"><span className="text-xs text-gray-400">{s.l}</span><span className={`text-base font-bold ${s.w ? 'text-red-600' : 'text-gray-700'}`}>{s.v}</span></div>
          ))}
          <div className="relative">
            <button onClick={() => { setPendingOpen(v => !v); setRevenueOpen(false) }} className="flex flex-col items-center leading-tight px-2 rounded-md hover:bg-gray-100" title="待付款明细">
              <span className="text-xs text-gray-400">待付款 {pendingOpen ? '▲' : '▼'}</span>
              <span className={`text-base font-bold ${pendingTotal > 0 ? 'text-red-600' : 'text-gray-700'}`}>{pendingTotal}</span>
            </button>
            {pendingOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPendingOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-60 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                  {[{ l: '授权代表年费', v: pendingAr, a: pendingArCny }, { l: '预申报费', v: pendingPre, a: pendingPreCny }].map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-xs text-gray-500">{r.l}</span>
                      <span className="flex items-center gap-2">
                        <span className={`text-xs ${r.v > 0 ? 'text-red-600' : 'text-gray-400'}`}>{r.v}笔</span>
                        <span className={`text-sm font-bold ${r.a > 0 ? 'text-red-600' : 'text-gray-700'}`}>¥{r.a.toLocaleString('zh-CN')}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button onClick={() => { setRevenueOpen(v => !v); setPendingOpen(false) }} className="flex flex-col items-center leading-tight px-2 rounded-md hover:bg-gray-100" title="收入明细">
              <span className="text-xs text-gray-400">收入 ¥ {revenueOpen ? '▲' : '▼'}</span>
              <span className="text-base font-bold text-gray-700">{revenueTotal.toLocaleString('zh-CN')}</span>
            </button>
            {revenueOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRevenueOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-60 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                  {[{ l: '授权代表年费', v: arCny, c: arClients }, { l: '预申报费', v: preCny, c: preClients }, { l: '年终结算费', v: settleCny, c: settleClients }].map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-xs text-gray-500">{r.l}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{r.c}家</span>
                        <span className="text-sm font-bold text-gray-700">¥{r.v.toLocaleString('zh-CN')}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
            <span className="text-xs text-amber-700">EUR/CNY</span>
            <span className="text-sm font-bold text-amber-800">{(rateInfo.rate||8.10).toFixed(2)}</span>
            <button onClick={() => { setRateModal(true); setRateNew(String(rateInfo.rate||8.10)) }} className="text-[10px] text-amber-600 hover:text-amber-800 underline">调</button>
            <button onClick={triggerFetch} disabled={rateSubmitting} className="text-[10px] text-amber-500 hover:text-amber-700" title="从中行抓取">↻</button>
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
            <div className="flex gap-2 flex-1">
              <form onSubmit={async (e) => { e.preventDefault(); if(!search.trim()) return; try { const r = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(search.trim())}&perPage=30`, { headers: ah() }); const d = await r.json(); if (r.ok) { setContracts(d.data.map(cl => ({ ...cl, id: cl.contract_id||cl.id, client_id: cl.id, status: cl.contract_status||cl.status, contract_number: cl.contract_number||'—', tier: cl.tier||'—', annual_fee_eur: cl.annual_fee_eur||0, lucid_confirmed: !!cl.lucid_confirmed, lucid_rep_accepted: !!cl.lucid_rep_accepted, pre_declared_status: cl.pre_declared_status, is_spam: cl.is_spam||0 }))); setPagination(d.pagination) } } catch (e) {} }} className="flex gap-2 items-center flex-wrap flex-1">
                <select value={statusFilter} onChange={e => { const v = e.target.value; setStatusFilter(v); setPendingFilter(''); setPage(1); load(1, false, v ? 1000 : 10) }}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-primary">
                  <option value="">全部状态</option>
                  {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} ({stats?.[o.countKey] || 0})</option>)}
                </select>
                <select value={pendingFilter} onChange={e => { const v = e.target.value; setPendingFilter(v); setStatusFilter(''); setPage(1); if (v === 'info_change') setInfoChangeOpen(true); load(1, false, (v && v !== 'info_change') ? 1000 : 10) }}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-primary">
                  <option value="">🔔 待办 ({pendingCount})</option>
                  <option value="stamp">待回签 ({Number(stats?.signed_waiting_clients) || 0})</option>
                  <option value="proof">待审凭证 ({Number(stats?.proof_pending_clients) || 0})</option>
                  <option value="sync">未同步 ({Number(stats?.not_synced_clients) || 0})</option>
                  <option value="info_change">信息修改申请 ({infoChangeApps.filter(a => a.status === 'pending').length})</option>
                </select>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="公司 / 手机号 / 联系人 / 法人 / 合同号后4位" className="border border-gray-300 rounded-md px-2 py-1.5 text-xs flex-1 min-w-0 focus:outline-none focus:border-primary" />
                <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-md text-xs font-medium">🔍 搜索</button>
                <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); setPendingFilter(''); load(1, false); setPage(1) }} className="px-3 py-1.5 border border-gray-200 rounded-md text-xs text-gray-500">重置</button>
              </form>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {currentList.length === 0 ? <p className="p-8 text-center text-sm text-gray-400">暂无数据</p> : (
            <table className="w-full text-sm table-fixed min-w-[960px]">
              <colgroup>
                <col style={{width:'22%'}} /><col style={{width:'8%'}} /><col style={{width:'11%'}} /><col style={{width:'13%'}} /><col style={{width:'11%'}} /><col style={{width:'11%'}} /><col style={{width:'24%'}} />
              </colgroup>
              <thead className="bg-gray-200 text-left"><tr><th className="px-2 py-3 font-bold text-gray-700 whitespace-nowrap">基本信息</th><th className="px-2 py-3 font-bold text-gray-700 whitespace-nowrap">服务周期</th><th className="px-2 py-3 font-bold text-gray-700 whitespace-nowrap">往年缴费凭证</th><th className="px-2 py-3 font-bold text-gray-700 whitespace-nowrap">授权代表年费</th><th className="px-2 py-3 font-bold text-gray-700 whitespace-nowrap">预申报费</th><th className="px-2 py-3 font-bold text-gray-700 whitespace-nowrap">年终结算</th><th className="px-2 py-3 font-bold text-gray-700 whitespace-nowrap">账户管理</th></tr></thead>
              <tbody>
                {currentList.map(c => {
                  const settlementOpen = new Date().getFullYear() > parseInt(c.end_date?.slice(0,4) || '0')
                  return (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-blue-50 even:bg-blue-50/40">
                    <td className="p-3 align-top">
                      <button onClick={() => { setInfoModal(c); setLucidPwd(null); setTaxEdit({ entity_type: c.entity_type || 'company', uscc: c.uscc || '', id_number: c.id_number || '' }); setTaxSaveMsg('') }} className="text-xs font-semibold text-primary hover:underline text-left">{c.company_name}</button>
                      {(c.entity_type === 'individual' ? !c.id_number : !c.uscc) && <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded">缺税号</span>}
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
                          const escAttr = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
                          const copyBtn = (text) => ' <button class="cp" type="button" data-v="'+escAttr(text)+'">复制</button>'
                          const tierName = c.tier==='basic'?'基础 €29/年':c.tier==='standard'?'标准 €49/年':'高级 €79/年'
                          const prepaidDisplay = c.prepaid_amount || prepaidCalc
                          const settleDisplay = c.settlement_amount || Math.abs(settleAmt)
                          const prepaidOverride = c.prepaid_amount > 0 && Math.abs(c.prepaid_amount - prepaidCalc) > 0.01
                          const settleOverride = c.settlement_amount > 0 && hasAnyActuals && Math.abs(c.settlement_amount - settleAmt) > 0.01
                          const prepaidCny = feeCnyDisplay(c.prepaid_cny, c.prepaid_rate, prepaidDisplay, rateInfo.rate)
                          const settlementCny = feeCnyDisplay(c.settlement_cny, c.settlement_rate, settleDisplay, rateInfo.rate)
                          let html = `<html><head><meta charset="UTF-8"><title>缴费明细 - ${e(c.company_name)}</title><style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;padding:24px;max-width:960px;margin:0 auto;color:#333;font-size:13px}h2{font-size:16px;margin-bottom:4px}.sub{color:#888;font-size:12px;margin-bottom:16px}h3{font-size:13px;margin:16px 0 8px;color:#555}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:4px 8px;text-align:left}th{color:#888;font-weight:400;border-bottom:1px solid #e0e0e0}td{border-bottom:1px solid #f0f0f0}.ar{font-size:12px}.ar p{margin:3px 0}.num{text-align:right;font-variant-numeric:tabular-nums}.r{color:#c00}.g{color:#0a0}.b{font-weight:700;color:#1a3a5f}.s{text-decoration:line-through;color:#999}.y{color:#b8860b}.grid{display:grid;grid-template-columns:180px 1fr;gap:24px}.settle-section{margin-top:20px}.bank-section{margin-top:20px;padding-top:16px;border-top:2px solid #e0e0e0}.bank-section h3{font-size:12px;color:#555;margin-bottom:6px}.bank-section p{font-size:11px;color:#888;margin:2px 0;line-height:1.6}.tbl{width:100%;border-collapse:collapse;font-size:12px}.tbl th{color:#666;font-weight:500;border-bottom:2px solid #ccc;padding:5px 8px;text-align:right}.tbl th:first-child{text-align:left}.tbl td{padding:5px 8px;border-bottom:1px solid #f0f0f0;text-align:right}.tbl td:first-child{text-align:left}.tbl .total-row td{border-top:2px solid #ccc;font-weight:700}.cp{cursor:pointer;margin-left:6px;padding:1px 8px;font-size:10px;color:#1a73e8;background:#eef4ff;border:1px solid #b6d0f2;border-radius:4px;vertical-align:middle}.cp:hover{background:#dbe9ff}</style></head><body>`
                          html += `<h2>${e(c.company_name)}</h2><p class="sub">${e(c.contract_number)} · ${e(tierName)}</p>`
                          html += '<div class="grid">'
                          // AR
                          html += '<div class="ar"><h3>授权代表年费</h3>'
                          html += `<p><span>服务等级</span> <b>${e(tierName)}</b></p>`
                          html += `<p><span>截止日期</span> ${c.end_date?.slice(0,10)||'-'}</p>`
                          html += `<p><span>状态</span> <span class="${c.status==='active'?'g':c.status==='terminated'?'r':'y'}">${c.status==='active'?'已付款':c.status==='terminated'?'已终止':'待付款'}</span></p>`
                          html += `<p><span>金额</span> <b class="b">€${c.annual_fee_eur}</b></p>`
                          html += `<p style="font-size:10px;color:#888">约 ¥${Math.round(c.annual_fee_eur * (rateInfo.rate||8.10))}</p></div>`
                          // Prepaid
                          html += '<div><h3>回收费预申报</h3><table>'
                          rows.forEach(r => { html += `<tr><td>${e(r.label)}</td><td class="num">${r.kg}kg</td><td class="num">€${r.rate}</td><td class="num">€${r.fee.toFixed(2)}</td></tr>` })
                          html += `<tr><td colspan="3">小计 · ${totalKg}kg</td><td class="num"><b>€${subtotal.toFixed(2)}</b></td></tr>`
                          if(prepaidCalc>subtotal) html += `<tr><td colspan="3" class="y">取起步价</td><td class="num y"><b>€${prepaidCalc.toFixed(2)}</b></td></tr>`
                          html += `</table><p class="b">预申报费 €${prepaidDisplay.toFixed(2)} ${c.prepaid_status==='paid'?'✓':''}</p>`
                          html += `<p style="font-size:10px;color:#888">≈ ¥${prepaidCny}</p>`
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
                            html += '<p style="font-size:10px;color:#888">约 ¥'+settlementCny+'</p>'
                            if(settleOverride) html += '<p class="s">公式值 €'+settleAmt.toFixed(2)+'</p>'
                            html += '</div>'
                          } else { html += '<p style="color:#999">暂无实际数据</p>' }
                          html += '</div>'
                          // ═══ Bank Info ═══
                          const b = bankInfo || {}
                          html += '<div class="bank-section"><h3>银行转账信息</h3>'
                          html += '<table style="font-size:11px;color:#666;line-height:1.8"><tr><td style="padding-right:20px;white-space:nowrap">开户行：</td><td>' + e(b.bank_name || '') + copyBtn(b.bank_name || '') + '</td></tr>'
                          html += '<tr><td>银行地址：</td><td>' + e(b.bank_address || '') + copyBtn(b.bank_address || '') + '</td></tr>'
                          html += '<tr><td>银行代码：</td><td>' + e(b.bank_code || '') + copyBtn(b.bank_code || '') + '</td></tr>'
                          html += '<tr><td>户名：</td><td>' + e(b.account_name || '') + copyBtn(b.account_name || '') + '</td></tr>'
                          html += '<tr><td>账号：</td><td><b>' + e(b.account_number || '') + '</b>' + copyBtn(b.account_number || '') + '</td></tr>'
                          html += '</table>'
                          html += '<div style="margin-top:10px;padding:12px;background:#fff4e5;border:1px solid #f0c36d;border-radius:6px;font-size:12px;line-height:1.7">'
                          html += '<p style="font-weight:700;color:#c0392b;margin:0 0 8px;font-size:14px">⚠️ 请务必分开转账支付，并附上转账附言，未填写或填写错误的转账附言将不予处理。由此类原因导致的退款，将在退款时扣除20元手续费用。</p>'
                          html += '<p style="margin:2px 0">· 授权代表年费　<b>€' + c.annual_fee_eur + '</b>（约 ¥' + Math.round(c.annual_fee_eur * (rateInfo.rate||8.10)) + '）</p>'
                          html += '<p style="margin:2px 0 6px;padding-left:14px">转账附言　<b>EPR-' + e(c.contract_number || '') + '-A</b>' + copyBtn('EPR-' + (c.contract_number || '') + '-A') + '</p>'
                          html += '<p style="margin:2px 0">· 预申报费　　<b>€' + prepaidDisplay.toFixed(2) + '</b>（约 ¥' + prepaidCny + '）</p>'
                          html += '<p style="margin:2px 0;padding-left:14px">转账附言　<b>EPR-' + e(c.contract_number || '') + '-V</b>' + copyBtn('EPR-' + (c.contract_number || '') + '-V') + '</p>'
                          html += '</div>'
                          html += '</div>'
                          html += '<script>(function(){function d(e){e.textContent="已复制";setTimeout(function(){e.textContent="复制"},1500)}function fb(e){var t=e.getAttribute("data-v"),a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy")}catch(_){}document.body.removeChild(a);d(e)}document.querySelectorAll(".cp").forEach(function(b){b.onclick=function(){var t=b.getAttribute("data-v");if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){d(b)}).catch(function(){fb(b)})}else{fb(b)}}})})();</script>'
                          html += '</body></html>'
                          setFeeDetailHtml(html)
                        }} className="text-[10px] text-gray-400 hover:text-primary mt-1">📊 缴费明细</button>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      {uploadLinks(c, 'proof_previous_year')}
                      {!uploadLinks(c, 'proof_previous_year') && (
                        <div className="mt-1"><span className="text-[10px] text-gray-300">暂无凭证</span></div>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <span className={`text-xs font-semibold ${c.status === 'pending_payment' ? 'text-yellow-600' : c.status === 'terminated' ? 'text-gray-400' : 'text-green-600'}`}>€{c.annual_fee_eur}</span>
                      {c.status === 'pending_payment' && <span className="text-yellow-600 text-xs font-semibold ml-1">待付</span>}
                      {c.status === 'active' && <span className="text-green-600 text-xs font-semibold ml-1">✓</span>}
                      {c.status === 'terminated' && <span className="text-gray-400 text-xs font-semibold ml-1">已终止</span>}
                      <div className="text-[10px] text-gray-400 mt-0.5">≈ ¥{Math.round(c.annual_fee_eur * (rateInfo.rate||8.10))}</div>
                      {uploadLinks(c, 'bank_proof', 'proof_annual_fee')}
                    </td>
                    <td className="p-3 align-top">
                      {c.pre_declared_status === 'approved' ? (
                        <>
                          <span className="text-xs text-green-600 font-medium">{c.prepaid_amount > 0 ? `€${Number(c.prepaid_amount).toFixed(2)} 已预申报 ✓` : '已预申报 ✓'}</span>
                          {c.prepaid_amount > 0 && <div className="text-[10px] text-gray-400 mt-0.5">≈ ¥{feeCnyDisplay(c.prepaid_cny, c.prepaid_rate, c.prepaid_amount, rateInfo.rate)}</div>}
                          {uploadLinks(c, 'proof_predeclared')}
                        </>
                      ) : c.pre_declared_status === 'pending' ? (
                        <>
                          <span className="text-xs text-yellow-600 font-medium">已预申报 · 待审核</span>
                          {uploadLinks(c, 'proof_predeclared', 'proof_prepaid')}
                          {!uploadLinks(c, 'proof_predeclared', 'proof_prepaid') && (
                            <div className="mt-1"><span className="text-[10px] text-gray-300">暂无凭证</span></div>
                          )}
                        </>
                      ) : (
                        <>
                          {c.prepaid_status === 'paid' ? (
                            <span className="text-xs text-green-600 font-medium">€{Number(c.prepaid_amount).toFixed(2)} ✓</span>
                          ) : c.prepaid_amount ? (
                            <span className="text-xs text-yellow-600">€{Number(c.prepaid_amount).toFixed(2)} 待付</span>
                          ) : (
                            <button onClick={() => { setFeeModal({ contractId: c.id, type: 'prepaid' }); setFeeAmount('') }}
                              className="text-xs text-primary hover:underline">💰 设置费用</button>
                          )}
                          {c.prepaid_amount > 0 && <div className="text-[10px] text-gray-400 mt-0.5">≈ ¥{feeCnyDisplay(c.prepaid_cny, c.prepaid_rate, c.prepaid_amount, rateInfo.rate)}</div>}
                          {uploadLinks(c, 'proof_prepaid')}
                          {!uploadLinks(c, 'proof_prepaid') && (
                            <div className="mt-1"><span className="text-[10px] text-gray-300">暂无凭证</span></div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      {c.settlement_status === 'paid' ? (
                        <span className="text-xs text-green-600 font-medium">€{Number(c.settlement_amount).toFixed(2)} ✓</span>
                      ) : c.settlement_amount ? (
                        <span className="text-xs text-yellow-600">€{Number(c.settlement_amount).toFixed(2)} 待付</span>
                      ) : settlementOpen ? (
                        <button onClick={() => { setFeeModal({ contractId: c.id, type: 'settlement' }); setFeeAmount('') }}
                          className="text-xs text-primary hover:underline">📋 设置结算</button>
                      ) : (
                        <span className="text-xs text-gray-300">⏳ 次年1月开放</span>
                      )}
                      {c.settlement_amount > 0 && <div className="text-[10px] text-gray-400 mt-0.5">≈ ¥{feeCnyDisplay(c.settlement_cny, c.settlement_rate, c.settlement_amount, rateInfo.rate)}</div>}
                      {uploadLinks(c, 'proof_settlement')}
                      {!uploadLinks(c, 'proof_settlement') && (
                        <div className="mt-1"><span className="text-[10px] text-gray-300">暂无凭证</span></div>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[10px] text-gray-400">状态</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_CLS[c.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_MAP[c.status] || c.status}</span>
                          <span className="text-[10px] text-gray-400">LUCID</span>
                          <span className="text-[10px]">{c.lucid_confirmed ? '✅ 已授权' : '⚠️ 待授权'}</span>
                          <span className="text-[10px] text-gray-400">Annehmen</span>
                          <span className="text-[10px]">{c.lucid_rep_accepted ? '✅ 已接受' : '⚠️ 待接受'}</span>
                          <button onClick={() => toggleLucidAnnehmen(c.id, c.lucid_rep_accepted)}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                            title={c.lucid_rep_accepted ? '取消「已接受」标记' : 'LIVANTO 已在 LUCID 中接受该客户后点此同步'}>
                            {c.lucid_rep_accepted ? '取消' : '🔄 同步'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => toggleSpam(c.id)}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${c.is_spam ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                            title={c.is_spam ? '取消标记' : '标记为垃圾'}>
                            {c.is_spam ? '🚫 已标记' : '🏴 垃圾'}
                          </button>
                          <button onClick={() => deleteContract(c.id)}
                            className="text-[10px] text-gray-300 hover:text-red-500" title="删除合同">
                            🗑 删除
                          </button>
                          <button onClick={() => deleteClient(c.client_id)}
                            className="text-[10px] text-gray-300 hover:text-red-500" title="删除账户（合同/联系方式/登录账号，邮箱电话释放）">
                            🗑 删账户
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => resetPassword(c.client_id)}
                            className="text-[10px] text-gray-400 hover:text-red-500">🔑 重置密码</button>
                          {c.status === 'active' && (
                            <details className="text-[10px]">
                              <summary className="cursor-pointer text-gray-500 hover:text-primary">📝 合同签署</summary>
                              <div className="mt-1 pl-2 border-l-2 border-gray-100 space-y-0.5 text-[10px] text-gray-500">
                                {(c.signed_at || (c._uploads?.signed_contract?.length > 0)) ? (
                                  <>
                                    <p>{c.signed_at ? `✅ 客户已签 · ${c.signed_at.slice(0,10)}` : '✅ 已上传签字合同'}</p>
                                    {(c._uploads?.signed_contract?.length > 0) && c._uploads.signed_contract.map(u => (
                                      <button key={u.id} onClick={() => authDownload(`/api/uploads/${u.id}/download`, u.original_name)}
                                        className="text-primary hover:underline">📥 下载签字合同</button>
                                    ))}
                                  </>
                                ) : <p>⏳ 待客户签</p>}
                                <label className="cursor-pointer text-primary hover:underline">
                                  📤 回签上传<input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => uploadStamped(e, c.client_id, c.id)} className="hidden" />
                                </label>
                                {(c._uploads?.admin_stamped?.length > 0) && c._uploads.admin_stamped.map(u => (
                                  <button key={u.id} onClick={() => authDownload(`/api/uploads/${u.id}/download`, u.original_name)}
                                    className="text-primary hover:underline block">📥 下载回签合同</button>
                                ))}
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
            <thead className="bg-gray-50 text-left"><tr><th className="p-3">ID</th><th className="p-3">客户</th><th className="p-3">类型</th><th className="p-3">状态</th><th className="p-3">日期</th><th className="p-3">操作</th></tr></thead>
            <tbody>{appList.map(a => <tr key={a.id} className="border-t border-gray-50"><td className="p-3 font-mono text-xs">{a.id}</td><td className="p-3">{a.company_name || '—'}</td><td className="p-3">{a.type}</td><td className="p-3"><span className="text-xs px-2 py-0.5 rounded bg-gray-100">{a.status}</span></td><td className="p-3 text-xs text-gray-400">{a.created_at?.slice(0, 10)}</td><td className="p-3"><button onClick={() => deleteApplication(a.id)} className="text-[10px] text-gray-300 hover:text-red-500">🗑 删除</button></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {/* Info Change Applications */}
      {infoChangeApps.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-6">
          <button onClick={() => setInfoChangeOpen(v => !v)} className="w-full p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50">
            <h2 className="font-bold text-sm text-gray-700">📝 信息修改申请 ({infoChangeApps.filter(a => a.status === 'pending').length})</h2>
            <span className="text-xs text-gray-400">{infoChangeOpen ? '▲ 收起' : '▼ 展开'}</span>
          </button>
          {infoChangeOpen && (
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{width:'4%'}} /><col style={{width:'12%'}} /><col style={{width:'40%'}} /><col style={{width:'11%'}} /><col style={{width:'10%'}} /><col style={{width:'23%'}} />
            </colgroup>
            <thead className="bg-gray-50 text-left"><tr><th className="p-3">ID</th><th className="p-3">客户</th><th className="p-3">修改内容</th><th className="p-3">状态</th><th className="p-3">日期</th><th className="p-3">操作</th></tr></thead>
            <tbody>
              {infoChangeApps.map(a => (
                <tr key={a.id} className="border-t border-gray-50 align-top">
                  <td className="p-3 font-mono text-xs">{a.id}</td>
                  <td className="p-3 break-all">{a.company_name || '—'}</td>
                  <td className="p-3 text-xs break-all">{renderChanges(a)}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}>{a.status === 'pending' ? '待审核' : a.status === 'approved' ? '已通过' : '已拒绝'}</span></td>
                  <td className="p-3 text-xs text-gray-400">{a.created_at?.slice(0, 10)}</td>
                  <td className="p-3">
                    <div className="flex gap-2 items-center">
                      {a.status === 'pending' && (
                        <>
                          <button onClick={() => reviewApplication(a.id, 'approve')} className="text-xs text-green-600 hover:underline font-medium">✅ 通过</button>
                          <button onClick={() => reviewApplication(a.id, 'reject')} className="text-xs text-red-500 hover:underline font-medium">❌ 拒绝</button>
                        </>
                      )}
                      <button onClick={() => deleteApplication(a.id)} className="text-[10px] text-gray-300 hover:text-red-500">🗑 删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
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
              {infoModal.entity_type === 'individual'
                ? (infoModal.id_number && <div className="flex justify-between"><span className="text-gray-400">身份证号</span><span className="font-mono font-medium">{infoModal.id_number}</span></div>)
                : (infoModal.uscc && <div className="flex justify-between"><span className="text-gray-400">税号/信用代码</span><span className="font-mono font-medium">{infoModal.uscc}</span></div>)}
              {infoModal.country && <div className="flex justify-between"><span className="text-gray-400">国家/地区</span><span className="font-medium">{CLIENT_COUNTRIES.find(c => c.code === infoModal.country)?.label || infoModal.country}</span></div>}
              {infoModal.vat_id && <div className="flex justify-between"><span className="text-gray-400">USt-IdNr</span><span className="font-mono font-medium">{infoModal.vat_id}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">联系人</span><span className="font-medium">{infoModal.contact_name||'—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">邮箱</span><span className="font-medium">{infoModal.contact_email}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">手机</span><span className="font-medium">{infoModal.contact_phone||'—'}</span></div>
              {infoModal.wechat_id && <div className="flex justify-between"><span className="text-gray-400">微信</span><span className="font-medium">{infoModal.wechat_id}</span></div>}
              {infoModal.legal_representative && <div className="flex justify-between"><span className="text-gray-400">法定代表人</span><span className="font-medium">{infoModal.legal_representative}</span></div>}
              {infoModal.lucid_registration_number && <div className="flex justify-between"><span className="text-gray-400">LUCID号</span><span className="font-mono font-medium">{infoModal.lucid_registration_number}</span></div>}
              {infoModal.lucid_login && <div className="flex justify-between"><span className="text-gray-400">LUCID 登录邮箱</span><span className="font-mono font-medium">{infoModal.lucid_login}</span></div>}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">LUCID 密码</span>
                {lucidPwd === null ? (
                  <button onClick={() => showLucidPassword(infoModal.client_id)} className="text-xs text-primary hover:underline">显示密码</button>
                ) : lucidPwd === '' ? (
                  <span className="text-xs text-gray-400">客户未填写</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{lucidPwd}</span>
                    <button onClick={() => navigator.clipboard?.writeText(lucidPwd)} className="text-xs text-primary hover:underline">复制</button>
                  </div>
                )}
              </div>
            </div>

            {/* LUCID 注册号直填 */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">✏️ LUCID 注册号（直填）</h4>
              <div className="flex gap-2">
                <input value={lucidEdit} onChange={e => setLucidEdit(e.target.value)} placeholder="DE 开头，如 DE1234567890123"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
                <button onClick={saveLucidNumber} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold">保存</button>
              </div>
              {lucidSaveMsg && <p className={`text-xs ${lucidSaveMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{lucidSaveMsg}</p>}
            </div>

            {taxEdit && (
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">✏️ 税号 / 身份证</h4>
                <div className="flex gap-2">
                  {[['company', '公司'], ['individual', '个人']].map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setTaxEdit(f => ({ ...f, entity_type: k }))}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium border ${taxEdit.entity_type === k ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {taxEdit.entity_type === 'company' ? (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">统一社会信用代码（税号）</label>
                    <input value={taxEdit.uscc} onChange={e => setTaxEdit(f => ({ ...f, uscc: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono" placeholder="91340400MADDK97K4X" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">身份证号码</label>
                    <input value={taxEdit.id_number} onChange={e => setTaxEdit(f => ({ ...f, id_number: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono" placeholder="18位身份证号码" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button onClick={saveAdminTax} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold">保存</button>
                  {taxSaveMsg && <span className={`text-xs ${taxSaveMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{taxSaveMsg}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setRateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">💱 设置 EUR/CNY 折算价</h3>
            <p className="text-xs text-gray-400">中国银行现汇卖出价 + 0.25，每日 9:00/14:00 自动抓取。<br/>上次更新: {rateInfo.updated_at ? new Date(rateInfo.updated_at).toLocaleString('zh-CN') : '—'}</p>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">CNY 折算价</label>
              <input type="number" step="0.01" min="0" value={rateNew} onChange={e => setRateNew(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg font-bold focus:outline-none focus:border-primary" placeholder="8.10" autoFocus />
              <p className="text-[10px] text-gray-400 mt-1">公式: 中国银行现汇卖出价 + 0.25 (FREDDY) · 自动抓取 BOC</p>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={triggerFetch} disabled={rateSubmitting} className="px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 rounded-md">🔄 从中行抓取</button>
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

      {/* Fee Detail Modal */}
      {feeDetailHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFeeDetailHtml(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-700">缴费明细</span>
              <button onClick={() => setFeeDetailHtml(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1">×</button>
            </div>
            <iframe srcDoc={feeDetailHtml} className="flex-1 w-full border-0" title="缴费明细" />
          </div>
        </div>
      )}
    </div>
  )
}
