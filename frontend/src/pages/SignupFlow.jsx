import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { PACKAGING_MATERIALS, AR_TIERS, WEEE_PRICES, BATTERY_PRICES, EMAIL_RE, WEEE_STARTING_PRICE, BATTERY_STARTING_PRICE } from '@shared/constants.js'

const MATERIALS = PACKAGING_MATERIALS

const AR_TIERS_LIST = Object.values(AR_TIERS).map(t => ({
  key: t.key, name: t.name, price: t.feeEur,
  desc: t.key === 'basic' ? '核心AR服务：系统参与、LUCID数据申报、官方通信'
    : t.key === 'standard' ? '基础+优先响应(48h)+扩展分类咨询+年度合规简报'
    : '标准+完整性声明协调+专属客户经理+24h响应',
  featured: t.featured || false,
}))

const WEEE_CATEGORIES = [
  { key: '1', label: '热交换器 (冰箱/空调)' },
  { key: '2', label: '显示屏/屏幕 (>100cm²)' },
  { key: '3', label: '灯具 (LED/荧光灯)' },
  { key: '4', label: '大型设备 (>50cm)' },
  { key: '5', label: '小型设备 (<50cm)' },
  { key: '6', label: '小型IT设备' },
]

const SVC = {
  packaging: { label: '德国包装法 · 本土授权代表', steps: ['委托方信息', '包装申报', '信息确认'], ctLabel: '授权代表合同' },
  weee: { label: 'WEEE 电子电气法', steps: ['委托方信息', '产品信息', '费用确认', '预览签署'], ctLabel: '授权代表合同 (WEEE)' },
  battery: { label: '电池法 BattG', steps: ['委托方信息', '产品信息', '费用确认', '预览签署'], ctLabel: '授权代表合同 (电池法)' },
}

const inputCls = 'w-full border border-gray-400 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary'
const errCls = (k, errors) => errors[k] ? 'border-red-400' : ''
const btnCls = 'px-6 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors'
const btnGhostCls = 'px-5 py-2.5 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-gray-50 transition-colors'

export default function SignupFlow() {
  const { type } = useParams()
  const serviceType = type === 'weee' ? 'weee' : type === 'battery' ? 'battery' : 'packaging'
  const cfg = SVC[serviceType]; const STEPS = cfg.steps
  const isPkg = serviceType === 'packaging'; const isWeee = serviceType === 'weee'

  const [searchParams, setSearchParams] = useSearchParams()
  const urlTier = searchParams.get('tier') || 'basic'
  const [step, setStep] = useState(() => Math.max(1, parseInt(searchParams.get('step')) || 1) - 1)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    company_name: '', company_name_en: '', registered_address: '', registered_address_en: '', uscc: '', legal_representative: '', legal_representative_en: '',
    contact_person: '', contact_person_en: '', contact_phone: '', wechat_id: '', contact_email: '',
    password: '', password_confirm: '', packaging_items: [], tier: urlTier,
    device_categories: [], brand_count: '1', year_type: 'first',
  })

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => { const n = {...e}; delete n[k]; return n }) }
  const fe = (k) => errors[k] ? <p className="text-red-500 text-xs mt-1">{errors[k]}</p> : null

  const validate = (s) => {
    const e = {}
    if (s === 0) {
      if (!form.company_name.trim()) e.company_name = '请输入公司名称（中文）'
      if (!form.company_name_en.trim()) e.company_name_en = '请输入公司名称（英/德）'
      if (!form.registered_address.trim()) e.registered_address = '请输入注册地址'
      if (!form.legal_representative.trim()) e.legal_representative = '请输入法定代表人（中文）'
      if (!form.legal_representative_en.trim()) e.legal_representative_en = '请输入法定代表人（英文）'
      if (!form.contact_person.trim()) e.contact_person = '请输入联系人（中文）'
      if (!form.contact_person_en.trim()) e.contact_person_en = '请输入联系人（英文）'
      if (!form.contact_phone.trim()) e.contact_phone = '请输入手机号'
      if (!form.wechat_id.trim()) e.wechat_id = '请输入微信号'
      if (!form.contact_email.trim()) e.contact_email = '请输入邮箱'
      else if (!EMAIL_RE.test(form.contact_email)) e.contact_email = '邮箱格式不正确'
      if (!form.password || form.password.length < 6) e.password = '请设置登录密码（至少6位）'
      if (form.password !== form.password_confirm) e.password_confirm = '两次密码输入不一致'
    }
    setErrors(e); return Object.keys(e).length === 0
  }

  const goStep = (n) => { setStep(n); setSearchParams({ step: String(n + 1) }, { replace: true }) }
  const next = (n) => { if (validate(step)) goStep(n) }

  // Packaging
  const [ni, setNi] = useState({ material: 'plastics', category: 'B2C', kg: '', example: '' })
  const addItem = () => {
    if (!ni.kg || parseFloat(ni.kg) <= 0) { setErrors({ kg: '请输入有效的重量' }); return }
    setErrors({})
    setForm(f => ({ ...f, packaging_items: [...f.packaging_items, { material: MATERIALS.find(m => m.key === ni.material)?.label || ni.material, material_key: ni.material, category: ni.category, kg: parseFloat(ni.kg), example: ni.example.trim() }] }))
    setNi({ material: 'plastics', category: 'B2C', kg: '', example: '' })
  }
  const rmItem = (i) => update('packaging_items', form.packaging_items.filter((_, j) => j !== i))
  const toggleCat = (k) => { const c = form.device_categories; update('device_categories', c.includes(k) ? c.filter(x => x !== k) : [...c, k]) }

  const buildBody = () => {
    const body = { service_type: serviceType, company_name: form.company_name.trim(), company_name_en: form.company_name_en.trim(), registered_address: form.registered_address.trim(), registered_address_en: (form.registered_address_en || '').trim(), uscc: form.uscc.trim(), legal_representative: form.legal_representative.trim(), legal_representative_en: form.legal_representative_en.trim(), contact_person: form.contact_person.trim(), contact_person_en: form.contact_person_en.trim(), contact_phone: form.contact_phone.trim(), wechat_id: form.wechat_id.trim(), contact_email: form.contact_email.trim(), password: form.password, tier: form.tier }
    if (isPkg) body.packaging_items = form.packaging_items.map(p => ({ material_type: p.material, category: p.category, estimated_kg: p.kg, example: p.example || '' }))
    else { body.device_categories = form.device_categories; body.brand_count = parseInt(form.brand_count) || 1; body.year_type = form.year_type }
    return body
  }

  const handleCreate = async () => {
    if (!validate(STEPS.length - 1)) return
    setSubmitting(true)
    try {
      // 1. Create contract (also creates user account)
      const res = await fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildBody()) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error || '创建合同失败')

      // 2. Auto-login with credentials from step 0
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.contact_email, password: form.password }),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) throw new Error(loginData.error || '自动登录失败')

      // 3. Store token and redirect to Dashboard
      localStorage.setItem('token', loginData.token)
      navigate('/dashboard')
    } catch (e) { alert('创建失败: ' + e.message); setSubmitting(false) }
  }

  const reviewFee = (() => {
    if (isPkg) return AR_TIERS_LIST.find(t => t.key === form.tier)?.price || AR_TIERS.basic.feeEur
    if (isWeee) { const cats = form.device_categories.length || 1; return WEEE_PRICES.baseFee + Math.max(0, cats - 1) * (WEEE_PRICES.extraCategory || 99) + Math.max(0, (parseInt(form.brand_count) || 1) - 1) * (WEEE_PRICES.extraBrand || 79.95) + (form.year_type === 'first' ? WEEE_PRICES.authFirstYear || 50.76 : 0) }
    return BATTERY_PRICES.baseFee + Math.max(0, (parseInt(form.brand_count) || 1) - 1) * (BATTERY_PRICES.extraBrand || 49) + (form.year_type === 'first' ? BATTERY_PRICES.authFirstYear || 50.76 : 0)
  })()

  return (
    <div className="min-h-screen py-10" style={{background:'#f4f2ef'}}><div className="max-w-4xl mx-auto px-4">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-extrabold mb-1">{cfg.label}</h1>
      </div>

      {/* Stepper — segmented blocks */}
      <div className="mb-10" style={{padding:'0 8px'}}>
        <div style={{maxWidth:700, margin:'0 auto'}}>
          <div style={{display:'flex', gap:4}}>
            {STEPS.map((s, i) => {
              const done = i < step
              const current = i === step
              return (
                <div key={i} style={{flex:1, position:'relative'}}>
                  <div style={{
                    height:40, borderRadius:8,
                    background: done ? 'linear-gradient(135deg, #4a5d50, #6b8a75)' :
                                current ? '#ffffff' : '#f4f2ef',
                    border: current ? '2px solid #6b8a75' :
                            done ? 'none' : '1px solid #d4cfc8',
                    boxShadow: done ? '0 0 10px rgba(45,138,78,0.2)' :
                               current ? '0 0 0 4px rgba(45,138,78,0.08)' : 'none',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all 0.4s ease',
                    overflow:'hidden', position:'relative',
                  }}>
                    {current && (
                      <div style={{
                        position:'absolute', top:0, bottom:0, width:24,
                        background:'linear-gradient(90deg, transparent 0%, rgba(45,138,78,0.06) 40%, rgba(45,138,78,0.12) 50%, rgba(45,138,78,0.06) 60%, transparent 100%)',
                        animation:'scan 2s ease-in-out infinite',
                      }}/>
                    )}
                    <span style={{
                      fontSize:13, fontWeight:700,
                      color: done ? '#e8f5e9' : current ? '#4a5d50' : '#a09a92',
                      zIndex:1, transition:'color 0.4s ease',
                    }}>
                      {done ? '✓' : i + 1}
                    </span>
                  </div>
                  <div style={{
                    marginTop:6, fontSize:14, fontWeight:(current || done) ? 600 : 400,
                    color: (current || done) ? '#4a5d50' : '#a09a92',
                    textAlign:'center', whiteSpace:'nowrap', transition:'color 0.4s ease',
                  }}>
                    {s}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step 0: §1 Vertragsparteien — Auftraggeber / Kunde */}
      {step === 0 && (
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-lg">委托方信息</h2>
          <p className="text-xs text-gray-400 -mt-2">Auftraggeber / Kunde</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">公司名称 / 中文 *</label>
              <input value={form.company_name} onChange={e => update('company_name', e.target.value)} className={`${inputCls} ${errCls('company_name', errors)}`} placeholder="福瑞笛（上海）信息咨询有限公司" />
              {fe('company_name')}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">公司名称 / 英文或拼音 *</label>
              <input value={form.company_name_en} onChange={e => update('company_name_en', e.target.value)} className={`${inputCls} ${errCls('company_name_en', errors)}`} placeholder="FREDDY (SHANGHAI) INFORMATION CONSULTING LTD." />
              {fe('company_name_en')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">注册地址 / 中文 *</label>
              <input value={form.registered_address} onChange={e => update('registered_address', e.target.value)} className={`${inputCls} ${errCls('registered_address', errors)}`} placeholder="中国上海市浦东新区陆家嘴环路88号金茂大厦58层5808室" />
              {fe('registered_address')}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">注册地址 / 英文或拼音</label>
              <input value={form.registered_address_en || ''} onChange={e => update('registered_address_en', e.target.value)} className={inputCls} placeholder="Room 5808, 58th Floor, Jin Mao Tower, 88 Lujiazui Ring Road, Shanghai, China" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">统一社会信用代码 / 税号（如有）</label>
            <div className="grid grid-cols-2 gap-3"><div>
            <input value={form.uscc} onChange={e => update('uscc', e.target.value)} className={inputCls} placeholder="91340400MADDK97K4X" />
            </div></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">法定代表人 / 中文 *</label>
              <input value={form.legal_representative} onChange={e => update('legal_representative', e.target.value)} className={`${inputCls} ${errCls('legal_representative', errors)}`} placeholder="冯巩" />
              {fe('legal_representative')}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">法定代表人 / 拼音 *</label>
              <input value={form.legal_representative_en} onChange={e => update('legal_representative_en', e.target.value)} className={`${inputCls} ${errCls('legal_representative_en', errors)}`} placeholder="Gong Feng" />
              {fe('legal_representative_en')}
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">联系人 / 中文 *</label>
              <input value={form.contact_person} onChange={e => update('contact_person', e.target.value)} className={`${inputCls} ${errCls('contact_person', errors)}`} placeholder="潘长江" />
              {fe('contact_person')}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">联系人 / 拼音 *</label>
              <input value={form.contact_person_en} onChange={e => update('contact_person_en', e.target.value)} className={`${inputCls} ${errCls('contact_person_en', errors)}`} placeholder="Changjiang Pan" />
              {fe('contact_person_en')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">手机号 *</label>
              <input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} className={`${inputCls} ${errCls('contact_phone', errors)}`} placeholder="+86 139xxxxxxxx" />
              {fe('contact_phone')}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">微信号 *</label>
              <input value={form.wechat_id} onChange={e => update('wechat_id', e.target.value)} className={`${inputCls} ${errCls('wechat_id', errors)}`} placeholder="freddy_epr" />
              {fe('wechat_id')}
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">E-Mail / 电子邮箱（用于登录）*</label>
            <input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} className={`${inputCls} ${errCls('contact_email', errors)}`} placeholder="your@email.com" />
            {fe('contact_email')}
            </div>
            <div></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Passwort / 登录密码 *</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className={`${inputCls} ${errCls('password', errors)}`} placeholder="至少6位字母数字组合" />
            {fe('password')}
            </div>
            <div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Passwort / 确认密码 *</label>
            <input type="password" value={form.password_confirm} onChange={e => { const v = e.target.value; update('password_confirm', v); if (v && form.password !== v) setErrors(prev => ({...prev, password_confirm: '两次密码输入不一致'})); else if (form.password === v) setErrors(prev => { const n = {...prev}; delete n.password_confirm; return n }) }} className={`${inputCls} ${errCls('password_confirm', errors)}`} placeholder="请再次输入密码" />
            {fe('password_confirm')}
            </div>
            <div></div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => next(1)} disabled={!form.company_name || !form.company_name_en || !form.registered_address || !form.legal_representative || !form.legal_representative_en || !form.contact_person || !form.contact_person_en || !form.contact_email || !form.contact_phone || !form.wechat_id || !form.password || !form.password_confirm} className={btnCls}>下一步 →</button>
          </div>
        </div>
      )}

      {/* Step 1a: Packaging Declaration */}
      {step === 1 && isPkg && (
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-lg">包装申报</h2>
          <p className="text-sm text-gray-500">添加您在德国市场使用的包装类型，授权代表据此完成双元系统对接。</p>
          {/* Input row — 4 columns + button, aligned with list below */}
          <div className="grid gap-2 items-end" style={{gridTemplateColumns:'2fr 0.7fr 1fr 1.2fr auto'}}>
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">材料类别</label>
              <select value={ni.material} onChange={e => setNi(n => ({ ...n, material: e.target.value }))} className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm">{MATERIALS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">类别</label>
              <select value={ni.category} onChange={e => setNi(n => ({ ...n, category: e.target.value }))} className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm"><option value="B2C">B2C</option><option value="B2B">B2B</option></select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">预估年量 (kg)</label>
              <input type="number" value={ni.kg} onChange={e => setNi(n => ({ ...n, kg: e.target.value }))} placeholder="kg/年" className={`w-full border border-gray-200 rounded-md px-2 py-2 text-sm ${errors.kg ? 'border-red-400' : ''}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-0.5">产品举例</label>
              <input value={ni.example} onChange={e => setNi(n => ({ ...n, example: e.target.value }))} placeholder="如：手机壳" className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm" />
            </div>
            <button onClick={addItem} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light self-end">+ 添加</button>
          </div>
          {errors.kg && <p className="text-red-500 text-xs mt-1">{errors.kg}</p>}
          {form.packaging_items.length > 0 && (
            <div className="space-y-1.5">
              {/* List header */}
              <div className="grid items-center px-3 py-1.5 text-xs text-gray-400 font-medium" style={{gridTemplateColumns:'2fr 0.7fr 1fr 1.2fr auto'}}>
                <span>材料类别</span><span>类别</span><span>预估年量</span><span>产品举例</span><span></span>
              </div>
              {form.packaging_items.map((item, i) => (
                <div key={i} className="grid items-center bg-gray-50 rounded-md px-3 py-2.5 text-sm" style={{gridTemplateColumns:'2fr 0.7fr 1fr 1.2fr auto'}}>
                  <span className="font-medium truncate">{item.material}</span>
                  <span className="text-gray-500 text-xs">{item.category}</span>
                  <span className="font-medium tabular-nums">{item.kg} kg</span>
                  <span className="text-gray-500 text-xs truncate">{item.example || '—'}</span>
                  <button onClick={() => rmItem(i)} className="text-red-400 text-xs hover:text-red-600 ml-2">删除</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button onClick={() => goStep(0)} className={btnGhostCls}>← 上一步</button>
            <button onClick={() => goStep(2)} className={btnCls}>下一步 →</button>
          </div>
        </div>
      )}

      {/* Step 1b: WEEE/Battery Product Info */}
      {step === 1 && !isPkg && (
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-lg">产品信息</h2>
          <p className="text-sm text-gray-500">请提供在德国市场销售的{isWeee ? '电子电气设备' : '电池及含电池产品'}信息。</p>
          {isWeee && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-600">设备类别（可多选）</label>
              <div className="grid grid-cols-2 gap-2">
                {WEEE_CATEGORIES.map(cat => (
                  <button key={cat.key} onClick={() => toggleCat(cat.key)} className={`text-left p-2.5 rounded-md text-sm border transition-colors ${form.device_categories.includes(cat.key) ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-gray-200 hover:border-gray-300'}`}>{cat.label}</button>
                ))}
              </div>
              {form.device_categories.length === 0 && <p className="text-xs text-gray-400 mt-1">请至少选择一种</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1 text-gray-600">{isWeee ? '品牌数量' : '电池品牌数量'}</label><select value={form.brand_count} onChange={e => update('brand_count', e.target.value)} className={inputCls}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1 text-gray-600">年份类型</label><select value={form.year_type} onChange={e => update('year_type', e.target.value)} className={inputCls}><option value="first">首年（含一次性费用）</option><option value="renewal">续年</option></select></div>
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => goStep(0)} className={btnGhostCls}>← 上一步</button>
            <button onClick={() => goStep(2)} disabled={isWeee && form.device_categories.length === 0} className={btnCls}>下一步 →</button>
          </div>
        </div>
      )}

      {/* Step 2b: WEEE/Battery Fee Summary */}
      {step === 2 && !isPkg && (
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-lg text-center">费用确认</h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            {isWeee && <div className="flex"><span className="text-gray-500">设备类别</span><span>{form.device_categories.length} 类</span></div>}
            <div className="flex"><span className="text-gray-500">品牌数量</span><span>{form.brand_count}</span></div>
            <div className="flex"><span className="text-gray-500">年份类型</span><span>{form.year_type === 'first' ? '首年' : '续年'}</span></div>
            <div className="border-t pt-2 mt-2 space-y-1">
              {isWeee && <><Row k="基础服务费" v={`€${WEEE_PRICES.baseFee}`} />{form.device_categories.length > 1 && <Row k={`额外类别 ×${form.device_categories.length - 1}`} v={`€${Math.max(0, form.device_categories.length - 1) * (WEEE_PRICES.extraCategory || 99)}`} />}{parseInt(form.brand_count) > 1 && <Row k={`额外品牌 ×${parseInt(form.brand_count) - 1}`} v={`€${Math.max(0, parseInt(form.brand_count) - 1) * (WEEE_PRICES.extraBrand || 79.95)}`} />}{form.year_type === 'first' && <Row k="首年授权费" v={`€${WEEE_PRICES.authFirstYear || 50.76}`} />}</>}
              {!isWeee && <><Row k="基础服务费" v={`€${BATTERY_PRICES.baseFee}`} />{parseInt(form.brand_count) > 1 && <Row k={`额外品牌 ×${parseInt(form.brand_count) - 1}`} v={`€${Math.max(0, parseInt(form.brand_count) - 1) * (BATTERY_PRICES.extraBrand || 49)}`} />}{form.year_type === 'first' && <Row k="首年授权费" v={`€${BATTERY_PRICES.authFirstYear || 50.76}`} />}</>}
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base"><span>预估年费</span><span className="text-primary">€{reviewFee}</span></div>
          </div>
          <p className="text-xs text-gray-400">* 最终费用以合同为准</p>
          <div className="flex">
            <button onClick={() => goStep(1)} className={btnGhostCls}>← 上一步</button>
            <button onClick={() => goStep(3)} className={btnCls}>下一步 →</button>
          </div>
        </div>
      )}

      {/* Step (last): Review & Sign */}
      {step === STEPS.length - 1 && (
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-lg">信息确认</h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div><span className="inline-block w-40 text-gray-400">服务</span><span className="font-medium">{cfg.label}</span></div>
            <div><span className="inline-block w-40 text-gray-400">公司（英文）</span><span className="font-medium text-xs">{form.company_name_en}</span></div>
            <div><span className="inline-block w-40 text-gray-400">公司（中文）</span><span className="font-medium">{form.company_name}</span></div>
            {form.registered_address_en && <div><span className="inline-block w-40 text-gray-400">地址（英文）</span><span className="font-medium text-xs">{form.registered_address_en}</span></div>}
            <div><span className="inline-block w-40 text-gray-400">地址（中文）</span><span className="font-medium text-xs">{form.registered_address}</span></div>
            {form.uscc && <div><span className="inline-block w-40 text-gray-400">信用代码</span><span className="font-medium text-xs">{form.uscc}</span></div>}
            {form.legal_representative_en && <div><span className="inline-block w-40 text-gray-400">法定代表人（拼音）</span><span className="font-medium text-xs">{form.legal_representative_en}</span></div>}
            <div><span className="inline-block w-40 text-gray-400">法定代表人（中文）</span><span className="font-medium">{form.legal_representative}</span></div>
            <div><span className="inline-block w-40 text-gray-400">联系人（拼音）</span><span className="font-medium text-xs">{form.contact_person_en}</span></div>
            <div><span className="inline-block w-40 text-gray-400">联系人（中文）</span><span className="font-medium">{form.contact_person}</span></div>
            <div><span className="inline-block w-40 text-gray-400">邮箱</span><span className="font-medium">{form.contact_email}</span></div>
            <div><span className="inline-block w-40 text-gray-400">手机</span><span className="font-medium">{form.contact_phone}</span></div>
            <div><span className="inline-block w-40 text-gray-400">微信</span><span className="font-medium">{form.wechat_id}</span></div>
            {isPkg && <>
                <div><span className="inline-block w-40 text-gray-400">套餐</span><span className="font-medium">{AR_TIERS_LIST.find(t => t.key === form.tier)?.name} — €{AR_TIERS_LIST.find(t => t.key === form.tier)?.price}/年</span></div>
                <div className="mt-3">
                  <span className="inline-block w-40 text-gray-400 align-top">包装申报</span>
                  <div className="inline-block">
                    <div className="grid text-xs text-gray-400 mb-1" style={{gridTemplateColumns:'2fr 0.7fr 1fr 1.2fr'}}>
                      <span>材料类别</span><span>类别</span><span>预估年量</span><span>产品举例</span>
                    </div>
                    {form.packaging_items.map((item, i) => (
                      <div key={i} className="grid text-sm mb-0.5" style={{gridTemplateColumns:'2fr 0.7fr 1fr 1.2fr'}}>
                        <span className="font-medium">{item.material}</span>
                        <span className="text-gray-500">{item.category}</span>
                        <span className="tabular-nums">{item.kg} kg</span>
                        <span className="text-gray-500 truncate">{item.example || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>}
            {isWeee && <div><span className="inline-block w-40 text-gray-400">设备类别</span><span className="font-medium">{form.device_categories.length} 类</span></div>}
            {!isPkg && <div><span className="inline-block w-40 text-gray-400">品牌数</span><span className="font-medium">{form.brand_count}</span></div>}
            <div className="border-t pt-2 mt-2 font-bold"><span>预估年费：</span><span className="text-primary">€{reviewFee}</span>{isPkg && <span className="text-gray-400 text-xs font-normal"> + 回收费用（按实际量缴纳）</span>}</div>
          </div>
          <p className="text-xs text-gray-400 pt-2">确认信息无误后，合同将自动生成。您可在登录后的 Dashboard 中下载、签署并上传合同。</p>
          <div className="flex justify-between pt-2">
            <button onClick={() => goStep(step - 1)} className={btnGhostCls}>← 上一步</button>
            <button onClick={handleCreate} disabled={submitting} className={btnCls}>{submitting ? '创建中...' : '确认无误，创建合同 →'}</button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

function Row({ k, v }) { return <div className="flex justify-between text-xs text-gray-500"><span>{k}</span><span>{v}</span></div> }
