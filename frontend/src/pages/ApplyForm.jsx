import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EMAIL_RE } from '@shared/constants.js'

const inpCls = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary'
const errCls = (k, e) => e[k] ? 'border-red-400' : ''

export default function ApplyForm() {
  const [params] = useSearchParams()
  const [type, setType] = useState(params.get('type') || 'weee')
  const [form, setForm] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', device_count: '1', brand_count: '1', year_type: 'first' })
  const [submitted, setSubmitted] = useState(false); const [loading, setLoading] = useState(false)
  const [error, setError] = useState(''); const [fe, setFe] = useState({})

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (fe[k]) setFe(e => { const n = { ...e }; delete n[k]; return n }) }
  const validate = () => { const e = {}; if (!form.company_name.trim()) e.company_name = '请输入公司名称'; if (!form.contact_name.trim()) e.contact_name = '请输入联系人'; if (!form.contact_email.trim()) e.contact_email = '请输入邮箱'; else if (!EMAIL_RE.test(form.contact_email)) e.contact_email = '邮箱格式不正确'; setFe(e); return Object.keys(e).length === 0 }
  const err = (k) => fe[k] ? <p className="text-red-500 text-xs mt-1">{fe[k]}</p> : null

  const submit = async (e) => { e.preventDefault(); if (!validate()) return; setLoading(true); setError(''); try { const r = await fetch('/api/forms/' + type, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || '提交失败'); setSubmitted(true) } catch (err) { setError(err.message) }; setLoading(false) }

  if (submitted) return <div className="max-w-lg mx-auto px-4 py-16 text-center"><div className="text-5xl mb-4">📨</div><h1 className="text-2xl font-extrabold mb-4">提交成功</h1><p className="text-gray-500 text-sm">您的{type === 'weee' ? 'WEEE' : '电池法'}注册申请已收到。<br />我们将在48小时内与您联系。</p></div>

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-center mb-1">在线申报 — {type === 'weee' ? 'WEEE 电子电气法' : '电池法 BattG'}</h1>
      <p className="text-center text-sm text-gray-400 mb-8">填写信息，48小时内处理您的申请</p>

      <div className="flex justify-center gap-2 mb-8">
        {['weee', 'battery'].map(t => <button key={t} onClick={() => setType(t)} className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${type === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{t === 'weee' ? 'WEEE' : '电池法'}</button>)}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</div>}

      <form onSubmit={submit} className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-gray-400 mb-1">公司名称 *</label><input value={form.company_name} onChange={e => update('company_name', e.target.value)} className={`${inpCls} ${errCls('company_name', fe)}`} placeholder="公司全称" />{err('company_name')}</div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">联系人 *</label><input value={form.contact_name} onChange={e => update('contact_name', e.target.value)} className={`${inpCls} ${errCls('contact_name', fe)}`} placeholder="姓名" />{err('contact_name')}</div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">邮箱 *</label><input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} className={`${inpCls} ${errCls('contact_email', fe)}`} placeholder="your@email.com" />{err('contact_email')}</div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">电话</label><input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} className={inpCls} placeholder="选填" /></div>
          {type === 'weee' && <div><label className="block text-xs font-medium text-gray-400 mb-1">设备类别数量</label><select value={form.device_count} onChange={e => update('device_count', e.target.value)} className={inpCls}>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}</select></div>}
          <div><label className="block text-xs font-medium text-gray-400 mb-1">品牌数量</label><select value={form.brand_count} onChange={e => update('brand_count', e.target.value)} className={inpCls}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">年份类型</label><select value={form.year_type} onChange={e => update('year_type', e.target.value)} className={inpCls}><option value="first">首年</option><option value="renewal">续年</option></select></div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50">{loading ? '提交中...' : '提交申请'}</button>
      </form>
    </div>
  )
}
