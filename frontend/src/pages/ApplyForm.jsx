import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EMAIL_RE } from '@shared/constants.js'

export default function ApplyForm() {
  const [params] = useSearchParams()
  const defaultType = params.get('type') || 'weee'
  const [type, setType] = useState(defaultType)
  const [form, setForm] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', device_count: '1', brand_count: '1', year_type: 'first' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (fieldErrors[k]) setFieldErrors(e => { const n = {...e}; delete n[k]; return n })
  }

  const validate = () => {
    const errs = {}
    if (!form.company_name.trim()) errs.company_name = '请输入公司名称'
    if (!form.contact_name.trim()) errs.contact_name = '请输入联系人'
    if (!form.contact_email.trim()) {
      errs.contact_email = '请输入邮箱'
    } else if (!EMAIL_RE.test(form.contact_email)) {
      errs.contact_email = '邮箱格式不正确'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/forms/' + type, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '提交失败')
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">📨</div>
        <h1 className="text-2xl font-bold mb-4">提交成功！</h1>
        <p className="text-text2 mb-2">您的{type === 'weee' ? 'WEEE' : '电池法'}注册申请已收到。</p>
        <p className="text-sm text-text2">我们将在48小时内与您联系，请留意邮箱 {form.contact_email}。</p>
      </div>
    )
  }

  const typeLabel = type === 'weee' ? 'WEEE 电子电气法' : '电池法 BattG'

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-2">在线申报 — {typeLabel}</h1>
      <p className="text-center text-text2 mb-8">填写以下信息，我们将在48小时内处理您的注册申请</p>

      {/* Type Toggle */}
      <div className="flex justify-center gap-2 mb-8">
        {['weee', 'battery'].map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${type === t ? 'bg-cyan text-white' : 'bg-border/15 text-text2 hover:bg-border'}`}>
            {t === 'weee' ? 'WEEE 电子电气法' : '电池法 BattG'}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-sm border border-card space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text2 mb-1">公司名称 *</label>
            <input required value={form.company_name} onChange={e => update('company_name', e.target.value)}
              className={`w-full border rounded-lg p-2.5 text-sm ${fieldErrors.company_name ? 'border-red-400' : ''}`} placeholder="您的公司全称" />
            {fieldErrors.company_name && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.company_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text2 mb-1">联系人 *</label>
            <input required value={form.contact_name} onChange={e => update('contact_name', e.target.value)}
              className={`w-full border rounded-lg p-2.5 text-sm ${fieldErrors.contact_name ? 'border-red-400' : ''}`} placeholder="姓名" />
            {fieldErrors.contact_name && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.contact_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text2 mb-1">邮箱 *</label>
            <input required type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)}
              className={`w-full border rounded-lg p-2.5 text-sm ${fieldErrors.contact_email ? 'border-red-400' : ''}`} placeholder="your@email.com" />
            {fieldErrors.contact_email && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.contact_email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text2 mb-1">电话</label>
            <input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} className="w-full border rounded-lg p-2.5 text-sm" placeholder="选填" />
          </div>
          {type === 'weee' && (
            <div>
              <label className="block text-sm font-medium text-text2 mb-1">设备类别数量</label>
              <select value={form.device_count} onChange={e => update('device_count', e.target.value)} className="w-full border rounded-lg p-2.5 text-sm">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text2 mb-1">品牌数量</label>
            <select value={form.brand_count} onChange={e => update('brand_count', e.target.value)} className="w-full border rounded-lg p-2.5 text-sm">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text2 mb-1">年份类型</label>
            <select value={form.year_type} onChange={e => update('year_type', e.target.value)} className="w-full border rounded-lg p-2.5 text-sm">
              <option value="first">首年 (含一次性费用)</option>
              <option value="renewal">续年</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-cyan text-white rounded-lg font-semibold hover:bg-cyan-light transition-colors disabled:opacity-50">
          {loading ? '提交中...' : '提交申请'}
        </button>
      </form>
    </div>
  )
}
