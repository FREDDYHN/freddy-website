import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { REPORTING_DEADLINE_MONTH, REPORTING_DEADLINE_DAY } from '@shared/constants.js'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [bankInfo, setBankInfo] = useState(null)
  const [genMsg, setGenMsg] = useState('')

  const token = sessionStorage.getItem('token')
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {}

  useEffect(() => {
    if (!token) { setError('login_required'); setLoading(false); return }

    Promise.all([
      fetch('/api/dashboard', { headers: authHeaders }),
      fetch('/api/uploads', { headers: authHeaders }),
      fetch('/api/bank-info'),
    ])
      .then(async ([dRes, uRes, bRes]) => {
        if (!dRes.ok) {
          if (dRes.status === 401) { window.dispatchEvent(new Event('auth:expired')); throw new Error('login_required') }
          throw new Error('Server error')
        }
        const [d, u, b] = await Promise.all([dRes.json(), uRes.json(), bRes.json()])
        if (d.success) setData(d.data)
        if (u.success) setUploads(u.data)
        setBankInfo(b)
      })
      .catch(e => { if (e.message !== 'login_required') setError(e.message) })
      .finally(() => setLoading(false))
  }, [])

  // Generate contract docx
  const handleGenContract = async (contractId, contractTier) => {
    setGenerating(contractId)
    setGenMsg('')
    try {
      // Determine type from contract tier
      const genType = contractTier === 'weee' ? 'weee' : contractTier === 'battery' ? 'battery' : 'ar'
      const res = await fetch(`/api/contracts/${contractId}/generate`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: genType, client_location: 'cn' }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setGenMsg(`✅ 合同已生成: ${d.contract_number}`)
      window.open(d.download_url, '_blank')
    } catch (e) { setGenMsg('❌ ' + e.message) }
    setGenerating(null)
  }

  // Upload signed contract
  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('file_type', 'signed_contract')
      if (data?.contracts?.[0]?.id) formData.append('contract_id', data.contracts[0].id)

      const res = await fetch('/api/uploads', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setUploads(prev => [d.file, ...prev])
      alert('✅ 文件上传成功')
    } catch (e) { alert('❌ 上传失败: ' + e.message) }
    setUploading(false)
    e.target.value = ''
  }

  // ── Login Required ──
  if (error === 'login_required') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">请先登录</h1>
        <p className="text-text2 mb-6">登录后即可查看您的合规面板</p>
        <Link to="/login" className="px-6 py-2 bg-cyan text-white rounded-lg font-medium">前往登录 →</Link>
      </div>
    )
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-8 bg-border rounded w-48" /><div className="h-32 bg-border/15 rounded" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-border/15 rounded" />)}</div></div></div>
  if (error) return <div className="max-w-4xl mx-auto px-4 py-16 text-center"><div className="text-4xl mb-4">⚠️</div><h1 className="text-xl font-bold mb-2">加载失败</h1><p className="text-text2 mb-4">{error}</p><button onClick={() => window.location.reload()} className="px-4 py-2 border rounded-lg text-sm">重试</button></div>
  if (!data?.contracts?.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">暂无合同</h1>
        <p className="text-text2 mb-6">请先 <Link to="/signup" className="text-cyan underline">在线签约</Link></p>
      </div>
    )
  }

  const c = data.contracts[0]
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date) - now) / (1000 * 60 * 60 * 24)))
  const reportYear = now.getMonth() < (REPORTING_DEADLINE_MONTH - 1) ? now.getFullYear() : now.getFullYear() + 1
  const reportDeadline = new Date(reportYear, REPORTING_DEADLINE_MONTH - 1, REPORTING_DEADLINE_DAY)
  const daysToReport = Math.ceil((reportDeadline - now) / (1000 * 60 * 60 * 24))

  const statusColor = { active: 'bg-green-100 text-green-700', pending_payment: 'bg-yellow-100 text-yellow-700', signed: 'bg-blue-100 text-blue-700', expired: 'bg-red-100 text-red-700' }
  const statusLabel = { active: '已激活', pending_payment: '待付款', signed: '已签署', expired: '已过期' }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-wrap items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">我的合规面板</h1>
          <p className="text-text2 text-sm">{data.client.company_name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/profile" className="px-3 py-1 text-sm border rounded-full text-text2 hover:bg-bg-light">✏️ 编辑资料</Link>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[c.status] || ''}`}>{statusLabel[c.status] || c.status}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '合同编号', value: c.contract_number, sub: c.tier?.toUpperCase() },
          { label: '年费', value: '€' + c.annual_fee_eur, sub: '含AR服务' },
          { label: '合同剩余', value: daysLeft + ' 天', sub: c.end_date, warn: daysLeft < 60 },
          { label: '距申报截止', value: daysToReport + ' 天', sub: `${reportYear}-${String(REPORTING_DEADLINE_MONTH).padStart(2,'0')}-${String(REPORTING_DEADLINE_DAY).padStart(2,'0')}`, warn: daysToReport < 45 },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl p-4 shadow-sm border border-card">
            <p className="text-xs text-muted mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.warn ? 'text-red-600' : 'text-cyan'}`}>{s.value}</p>
            <p className="text-xs text-muted">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* LUCID */}
      <div className={`rounded-xl p-6 mb-8 shadow-sm border ${c.lucid_confirmed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{c.lucid_confirmed ? '✅' : '⚠️'}</span>
          <div>
            <h3 className="font-bold">{c.lucid_confirmed ? 'LUCID 已确认' : 'LUCID 待确认'}</h3>
            <p className="text-sm text-text2">{c.lucid_confirmed ? '合规已生效。' : '请在LUCID系统中将 LIVANTO GmbH 指定为授权代表。'}</p>
          </div>
        </div>
      </div>

      {/* Contract Actions */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-card mb-8">
        <h3 className="font-bold mb-4">📄 合同管理</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <button onClick={() => handleGenContract(c.id, c.tier)} disabled={generating === c.id}
            className="px-4 py-2 bg-cyan text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {generating === c.id ? '生成中...' : '📥 生成并下载合同'}
          </button>
          <label className={`px-4 py-2 border rounded-lg text-sm font-medium cursor-pointer hover:bg-bg-light ${uploading ? 'opacity-50' : ''}`}>
            {uploading ? '上传中...' : '📤 上传签字盖章合同'}
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
        {genMsg && <p className={`text-sm ${genMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'} mb-2`}>{genMsg}</p>}

        {/* Uploaded Files */}
        {uploads.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">已上传文件</h4>
            <div className="space-y-2">
              {uploads.map(f => (
                <div key={f.stored_path} className="flex justify-between items-center text-sm bg-bg-light rounded-lg p-3">
                  <span>{f.original_name}</span>
                  <span className="text-xs text-muted">{new Date(f.uploaded_at).toLocaleDateString('zh-CN')}</span>
                  <a href={`/api/uploads/${f.id || '0'}/download`} className="text-cyan text-xs font-medium">下载</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* I've Paid button */}
      {c.status === 'pending_payment' && (
        <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-200 mb-4 text-center">
          <p className="text-sm text-yellow-700 mb-2">📌 请完成银行转账后点击下方按钮通知管理员确认。</p>
          <button onClick={async () => {
            if (!confirm('确认您已完成银行转账？管理员将核对到账后激活合同。')) return
            try {
              const res = await fetch('/api/payments/notify', {
                method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ contract_id: c.id }),
              })
              const d = await res.json()
              if (!res.ok) throw new Error(d.error)
              alert('✅ 已通知管理员，合同激活后将可下载盖章版。')
              window.location.reload()
            } catch(e) { alert('❌ 操作失败: ' + e.message) }
          }} className="px-6 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600">
            💰 我已完成银行转账
          </button>
        </div>
      )}

      {/* Bank Transfer Info */}
      {c.status === 'pending_payment' && bankInfo && (
        <div className="bg-blue-50 rounded-xl p-6 shadow-sm border border-blue-200 mb-8">
          <h3 className="font-bold mb-3">💳 银行转账付款信息</h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-text2">银行：</span>{bankInfo.bank_name}</div>
            <div><span className="text-text2">账户名：</span>{bankInfo.account_name}</div>
            <div><span className="text-text2">账号：</span>{bankInfo.account_number}</div>
            <div><span className="text-text2">SWIFT：</span>{bankInfo.swift}</div>
          </div>
          <p className="text-xs text-blue-600 mt-3">💡 转账请备注 "{bankInfo.reference_prefix}{c.contract_number}"，到账后合同自动激活。</p>
        </div>
      )}

      {/* Packaging + Payments */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-card">
          <h3 className="font-bold mb-4">包装申报 ({data.packaging.length} 种)</h3>
          {data.packaging.length === 0 ? <p className="text-sm text-muted">暂无包装数据</p> :
            data.packaging.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
                <span>{p.material_type}</span><span className="text-muted text-xs">{p.packaging_category}</span>
                <span className="font-medium">{p.estimated_quantity_kg} kg</span>
              </div>
            ))}
        </div>
        <div className="bg-card rounded-xl p-6 shadow-sm border border-card">
          <h3 className="font-bold mb-4">支付记录</h3>
          {data.payments.length === 0 ? <p className="text-sm text-muted">暂无支付记录</p> :
            data.payments.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
                <span>¥{p.amount_cny} <span className="text-muted text-xs">{p.payment_method === 'wechat' ? '微信' : p.payment_method === 'alipay' ? '支付宝' : p.payment_method}</span></span>
                <span className={`text-xs px-2 py-0.5 rounded ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-border/15 text-text2'}`}>{p.status === 'paid' ? '已付' : '待付'}</span>
              </div>
            ))}
          {data.invoices.map(inv => (
            <div key={inv.id} className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-card">
              <span className="text-text2">发票 {inv.invoice_number}</span>
              <span>€{inv.amount_eur}</span>
              <span className="text-xs text-green-600">{inv.status === 'issued' ? '已开具' : inv.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
