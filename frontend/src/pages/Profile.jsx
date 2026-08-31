import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CLIENT_CHANGEABLE_FIELDS, containsChinese } from '@shared/constants.js'

const inpCls = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary'
const btnCls = 'px-5 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50'

export default function Profile() {
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [pw, setPw] = useState({ c: '', n: '', x: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [taxForm, setTaxForm] = useState(null)
  const [taxMsg, setTaxMsg] = useState('')
  const [changeOpen, setChangeOpen] = useState(false)
  const [changeForm, setChangeForm] = useState({})
  const [changeSubmitting, setChangeSubmitting] = useState(false)

  const ah = () => { const t = sessionStorage.getItem('token'); return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : {} }

  useEffect(() => { fetch('/api/profile', { headers: ah() }).then(r => r.json()).then(d => { if (d.success) { setP(d.data); setTaxForm({ entity_type: d.data.entity_type || 'company', uscc: d.data.uscc || '', id_number: d.data.id_number || '' }) } }).catch(() => {}).finally(() => setLoading(false)) }, [])

  const chPw = async (e) => { e.preventDefault(); if (pw.n !== pw.x) { setPwMsg('❌ 两次密码不一致'); return }; if (pw.n.length < 6) { setPwMsg('❌ 密码至少6位'); return }; setPwMsg(''); try { const r = await fetch('/api/profile/password', { method: 'PUT', headers: ah(), body: JSON.stringify({ current_password: pw.c, new_password: pw.n }) }); const d = await r.json(); if (r.ok) { setPwMsg('✅ 密码已更新'); setPw({ c: '', n: '', x: '' }) } else setPwMsg('❌ ' + d.error) } catch (e) { setPwMsg('❌ ' + e.message) } }

  const saveTax = async () => {
    if (!taxForm || !p) return
    if (taxForm.entity_type === 'individual') {
      if (!taxForm.id_number.trim()) { setTaxMsg('❌ 请输入身份证号码'); return }
      if (!/^\d{17}[\dXx]$/.test(taxForm.id_number.trim())) { setTaxMsg('❌ 身份证号码格式不正确（18位）'); return }
    } else {
      if (!taxForm.uscc.trim()) { setTaxMsg('❌ 请输入统一社会信用代码'); return }
      if (!/^([0-9A-Za-z]{18}|\d{8})$/.test(taxForm.uscc.trim())) { setTaxMsg('❌ 税号格式不正确（18位统一社会信用代码，或8位香港商业登记号）'); return }
    }
    setTaxMsg('')
    try {
      const body = {
        company_name: p.company_name, company_name_en: p.company_name_en || '',
        contact_name: p.contact_name || '', contact_phone: p.contact_phone || '', wechat_id: p.wechat_id || '',
        entity_type: taxForm.entity_type, uscc: taxForm.uscc.trim(), id_number: taxForm.id_number.trim(),
        registered_address: p.registered_address || '', legal_representative: p.legal_representative || '',
        lucid_registration_number: p.lucid_registration_number || '',
      }
      const r = await fetch('/api/profile', { method: 'PUT', headers: ah(), body: JSON.stringify(body) })
      const d = await r.json()
      if (r.ok) { setTaxMsg('✅ 已保存'); setP({ ...p, entity_type: taxForm.entity_type, uscc: taxForm.uscc.trim(), id_number: taxForm.id_number.trim() }) }
      else setTaxMsg('❌ ' + (d.error || '保存失败'))
    } catch (e) { setTaxMsg('❌ ' + e.message) }
  }

  const openChange = () => {
    setChangeForm({
      company_name: p?.company_name || '',
      company_name_en: p?.company_name_en || '',
      registered_address: p?.registered_address || '',
      registered_address_en: p?.registered_address_en || '',
      legal_representative: p?.legal_representative || '',
      legal_representative_en: p?.legal_representative_en || '',
      contact_name: p?.contact_name || '',
      contact_phone: p?.contact_phone || '',
      wechat_id: p?.wechat_id || '',
      lucid_registration_number: p?.lucid_registration_number || '',
    })
    setMsg('')
    setChangeOpen(true)
  }

  const submitChange = async () => {
    // 只提交与当前值不同的字段
    const changes = {}
    for (const [field, val] of Object.entries(changeForm)) {
      const cur = (p?.[field] || '').toString().trim()
      const next = String(val ?? '').trim()
      if (next && next !== cur) changes[field] = next
    }
    if (Object.keys(changes).length === 0) { setMsg('❌ 未修改任何字段'); return }
    // 英文/拼音字段禁止中文
    const noChineseFields = ['company_name_en', 'legal_representative_en', 'registered_address_en']
    if (noChineseFields.some(f => changes[f] && containsChinese(changes[f]))) { setMsg('❌ 请输入英文或拼音（不能包含中文）'); return }
    setChangeSubmitting(true)
    try {
      const r = await fetch('/api/profile/change-request', {
        method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      })
      const d = await r.json()
      if (r.ok) { setChangeOpen(false); setMsg('✅ 已提交，等待管理员审核') }
      else setMsg('❌ ' + (d.error || '申请失败，请联系客服'))
    } catch { setMsg('❌ 网络错误') }
    setChangeSubmitting(false)
  }

  const user = (() => { try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null } })()
  const isAdmin = user?.role === 'admin'

  if (loading) return <div className="max-w-xl mx-auto px-4 py-16"><div className="animate-pulse h-32 bg-gray-100 rounded" /></div>
  if (!user) return <div className="max-w-xl mx-auto px-4 py-16 text-center"><p className="text-gray-400">请先 <Link to="/login" className="text-primary underline font-medium">登录</Link></p></div>
  if (isAdmin) return <div className="max-w-xl mx-auto px-4 py-16 text-center"><p className="text-gray-400">管理员账户 <Link to="/admin" className="text-primary underline font-medium">前往后台</Link></p></div>
  if (!p) return <div className="max-w-xl mx-auto px-4 py-16 text-center"><p className="text-gray-400">未找到客户资料</p></div>

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold mb-1">账户管理</h1>
      <p className="text-sm text-gray-400 mb-8">{p.company_name}</p>

      <div className="bg-white border border-gray-100 rounded-lg p-5 space-y-4 mb-6">
        <h2 className="font-bold">公司信息</h2>
        <p className="text-xs text-gray-400">信息已写入合同，如需修改请联系管理员。</p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ['公司名称', p.company_name],
            ['英文名', p.company_name_en],
            [p.entity_type === 'individual' ? '身份证号' : '信用代码', p.entity_type === 'individual' ? p.id_number : p.uscc],
            ['法定代表人', p.legal_representative],
            ['联系人', p.contact_name],
            ['手机号', p.contact_phone],
            ['注册地址', p.registered_address],
            ['LUCID 注册号', p.lucid_registration_number],
            ['微信', p.wechat_id],
          ].map(([label, val]) => val ? (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
              <p className="text-sm text-gray-700 py-1.5">{val}</p>
            </div>
          ) : null)}
        </div>
        <button onClick={openChange} className="px-4 py-2 border border-primary text-primary rounded-md text-sm font-medium hover:bg-primary/5">
          📝 申请修改信息
        </button>
        {msg && <p className={`text-xs ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
      </div>

      {taxForm && (
        <div className="bg-white border border-gray-100 rounded-lg p-5 space-y-4 mb-6">
          <h2 className="font-bold">税号 / 身份证（预申报必填）</h2>
          <p className="text-xs text-gray-400">预申报需要您的身份标识号：公司请填统一社会信用代码，个人请填身份证号码。</p>
          <div className="flex gap-2">
            {[['company', '公司'], ['individual', '个人']].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTaxForm(f => ({ ...f, entity_type: k }))}
                className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${taxForm.entity_type === k ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>
          {taxForm.entity_type === 'company' ? (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">统一社会信用代码（税号）* <span className="text-gray-300">（香港客户填 8 位商业登记号）</span></label>
              <input value={taxForm.uscc} onChange={e => setTaxForm(f => ({ ...f, uscc: e.target.value }))} className={inpCls} placeholder="91340400MADDK97K4X" />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">身份证号码 *</label>
              <input value={taxForm.id_number} onChange={e => setTaxForm(f => ({ ...f, id_number: e.target.value }))} className={inpCls} placeholder="18位身份证号码" />
            </div>
          )}
          {taxMsg && <p className={`text-xs ${taxMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{taxMsg}</p>}
          <button type="button" onClick={saveTax} className={btnCls}>保存税号</button>
        </div>
      )}

      <form onSubmit={chPw} className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
        <h2 className="font-bold">修改密码</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="block text-xs font-medium text-gray-400 mb-1">当前密码</label><input type="password" value={pw.c} onChange={e => setPw(pr => ({ ...pr, c: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">新密码</label><input type="password" value={pw.n} onChange={e => setPw(pr => ({ ...pr, n: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">确认新密码</label><input type="password" value={pw.x} onChange={e => setPw(pr => ({ ...pr, x: e.target.value }))} className={inpCls} /></div>
        </div>
        {pwMsg && <p className={`text-xs ${pwMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>}
        <button type="submit" className={btnCls}>修改密码</button>
      </form>

      {changeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setChangeOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">申请修改公司信息</h3>
              <button onClick={() => setChangeOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-gray-400">只填写需要修改的字段，提交后由管理员审核，通过后生效。</p>
            <div className="space-y-3">
              {Object.entries(CLIENT_CHANGEABLE_FIELDS).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
                  <input value={changeForm[field] || ''} onChange={e => setChangeForm(f => ({ ...f, [field]: e.target.value }))} className={inpCls} />
                </div>
              ))}
            </div>
            <button onClick={submitChange} disabled={changeSubmitting} className={btnCls}>提交申请</button>
          </div>
        </div>
      )}
    </div>
  )
}
