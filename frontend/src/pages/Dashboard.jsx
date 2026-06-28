import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { REPORTING_DEADLINE_MONTH, REPORTING_DEADLINE_DAY } from '@shared/constants.js'
import StatCard from '../components/dashboard/StatCard'
import ContractProgress from '../components/dashboard/ContractProgress'
import UrgentAlertBanner from '../components/dashboard/UrgentAlertBanner'
import BillingCard from '../components/dashboard/BillingCard'
import ContractCard from '../components/dashboard/ContractCard'
import LucidCard from '../components/dashboard/LucidCard'
import ClientInfoCard from '../components/dashboard/ClientInfoCard'

const TIER_LABELS = { basic: '基础套餐 / BASIC', standard: '标准套餐 / STANDARD', premium: '高级套餐 / PREMIUM', weee: 'WEEE 合规', battery: '电池法 合规' }
function tierLabel(t) { return TIER_LABELS[t] || t?.toUpperCase() || '' }

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bankInfo, setBankInfo] = useState(null)

  function authHeaders() {
    const t = sessionStorage.getItem('token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) { setError('login_required'); setLoading(false); return }
    const h = authHeaders()
    Promise.all([
      fetch('/api/dashboard', { headers: h }),
      fetch('/api/uploads', { headers: h }),
      fetch('/api/bank-info'),
    ]).then(async ([dR, uR, bR]) => {
      if (!dR.ok) {
        if (dR.status === 401) { window.dispatchEvent(new Event('auth:expired')); return }
        throw new Error('Server error')
      }
      const [d, u, b] = await Promise.all([dR.json(), uR.json(), bR.json()])
      if (d.success) setData(d.data)
      if (u.success) setUploads(u.data)
      setBankInfo(b)
    }).catch(e => { setError(e.message) }).finally(() => setLoading(false))
  }, [])

  // ── Helpers ──

  /** Download a protected URL with auth token, trigger browser save dialog */
  async function authDownload(url, filename) {
    const token = sessionStorage.getItem('token')
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) throw new Error(`下载失败 (${r.status})`)
    const blob = await r.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename || ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objUrl)
  }

  // ── Handlers ──

  const handleGen = async (id, contractNumber) => {
    const pendingUrl = sessionStorage.getItem('pending_download')
    const pendingNo = sessionStorage.getItem('pending_contract_no')
    if (pendingUrl) {
      await authDownload(pendingUrl, `${pendingNo || 'contract'}.docx`)
      sessionStorage.removeItem('pending_download')
      sessionStorage.removeItem('pending_contract_no')
      return
    }
    const token = sessionStorage.getItem('token')
    if (!token) { alert('未登录，请重新登录'); throw new Error('未登录') }
    const r = await fetch(`/api/contracts/${id}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ar', client_location: 'cn' }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error)
    await authDownload(d.download_url, `${d.contract_number || 'contract'}.docx`)
  }

  const handleUpload = async (file, contractId) => {
    const token = sessionStorage.getItem('token')
    if (!token) { alert('未登录，请重新登录'); return }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('file_type', 'signed_contract')
    if (contractId) fd.append('contract_id', String(contractId))
    const r = await fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error)
    setUploads(p => [d.file, ...p])
    alert('✅ 文件上传成功')
  }

  const handlePaymentNotify = async (contractId) => {
    const token = sessionStorage.getItem('token')
    if (!token) { alert('未登录'); return }
    if (!confirm('确认已完成银行转账？管理员核对后将激活合同。')) return
    const r = await fetch('/api/payments/notify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_id: contractId }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error)
    alert('✅ 已通知管理员，核对到账后将激活合同。')
    window.location.reload()
  }

  const handleLucidToggle = async (contractId, currentlyConfirmed) => {
    const token = sessionStorage.getItem('token')
    if (!token) { alert('未登录'); return }
    const endpoint = currentlyConfirmed
      ? `/api/contracts/${contractId}/cancel-lucid`
      : `/api/contracts/${contractId}/confirm-lucid`
    const r = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error)
    window.location.reload()
  }

  // ── Render states ──

  if (error === 'login_required') return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold mb-4">请先登录</h1>
      <p className="text-gray-400 mb-6">登录后查看合规面板</p>
      <Link to="/login" className="inline-block px-6 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors">前往登录 →</Link>
    </div>
  )

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-32 bg-gray-100 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded" />)}
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold mb-2">加载失败</h1>
      <p className="text-gray-400 mb-4">{error}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 border rounded-md text-sm">重试</button>
    </div>
  )

  if (!data?.contracts?.length) return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold mb-4">暂无合同</h1>
      <p className="text-gray-400 mb-6">请先 <Link to="/signup" className="text-primary underline font-medium">在线签约</Link></p>
    </div>
  )

  // ── Derived data ──

  const c = data.contracts[0]
  const now = new Date()
  const reportYear = now.getMonth() < (REPORTING_DEADLINE_MONTH - 1) ? now.getFullYear() : now.getFullYear() + 1
  const daysToReport = Math.ceil((new Date(reportYear, REPORTING_DEADLINE_MONTH - 1, REPORTING_DEADLINE_DAY) - now) / 86400000)
  const activationDate = c.paid_confirmed_at ? new Date(c.paid_confirmed_at) : new Date(c.start_date)
  const effectiveEnd = new Date(activationDate)
  effectiveEnd.setFullYear(effectiveEnd.getFullYear() + 1)
  const daysLeft = Math.max(0, Math.ceil((effectiveEnd - now) / 86400000))

  const urgency = (d, crit, warn) => d <= crit ? 'critical' : d <= warn ? 'warning' : d <= 30 ? 'notice' : 'safe'
  const sc = { active: 'bg-green-100 text-green-700', pending_payment: 'bg-yellow-100 text-yellow-700', signed: 'bg-blue-100 text-blue-700', expired: 'bg-red-100 text-red-700' }
  const sl = { active: '已激活', pending_payment: '待付款', signed: '已签署', expired: '已过期' }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">我的合规面板</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data.client.company_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-md text-sm font-medium ${sc[c.status] || ''}`}>{sl[c.status] || c.status}</span>
          <button onClick={() => navigate('/profile')} className="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-gray-50 transition-colors">✏️ 编辑资料</button>
        </div>
      </div>

      {/* Zone A — Urgent Alert */}
      <UrgentAlertBanner reminders={data.reminders} contract={c} />

      {/* Zone B — Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="合同编号" value={c.contract_number} sub={tierLabel(c.tier)} copyable />
        <StatCard label="年费状态" value={`€${c.annual_fee_eur}`} sub={c.status === 'pending_payment' ? '待付款' : '已付款'} urgency={c.status === 'pending_payment' ? 'warning' : 'safe'} />
        <StatCard label="合同剩余" value={`${daysLeft}`} unit="天" sub={effectiveEnd.toISOString().slice(0, 10)} urgency={urgency(daysLeft, 30, 60)} />
        <StatCard label="距申报截止" value={`${daysToReport}`} unit="天" sub={`${reportYear}-${String(REPORTING_DEADLINE_MONTH).padStart(2, '0')}-${String(REPORTING_DEADLINE_DAY).padStart(2, '0')}`} urgency={urgency(daysToReport, 14, 30)} />
      </div>

      {/* Zone C — Contract Lifecycle Progress */}
      <ContractProgress contract={c} packaging={data.packaging} />

      {/* Zone D — Contract Management (full width) */}
      <ContractCard
        contract={c}
        uploads={uploads}
        onGenerate={handleGen}
        onUpload={handleUpload}
      />

      {/* Zone D2 — Billing & Declarations (full width) */}
      <BillingCard
        contracts={data.contracts}
        packaging={data.packaging}
        payments={data.payments}
        invoices={data.invoices}
        uploads={uploads}
        bankInfo={bankInfo}
        onNotifyPaid={handlePaymentNotify}
        onUpload={handleUpload}
      />

      {/* Zone D3 — LUCID + Client Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <LucidCard contract={c} onToggle={handleLucidToggle} />
        <ClientInfoCard client={data.client} />
      </div>
    </div>
  )
}
