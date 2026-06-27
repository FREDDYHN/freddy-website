import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  packaging: { label: '包装法授权代表', steps: ['信息：委托方 / 客户', '包装申报', '套餐选择', '预览签署'], ctLabel: '授权代表合同' },
  weee: { label: 'WEEE 电子电气法', steps: ['信息：委托方 / 客户', '产品信息', '费用确认', '预览签署'], ctLabel: '授权代表合同 (WEEE)' },
  battery: { label: '电池法 BattG', steps: ['信息：委托方 / 客户', '产品信息', '费用确认', '预览签署'], ctLabel: '授权代表合同 (电池法)' },
}

const inputCls = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary'
const errCls = (k, errors) => errors[k] ? 'border-red-400' : ''
const btnCls = 'px-6 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors'
const btnGhostCls = 'px-5 py-2.5 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-gray-50 transition-colors'

export default function SignupFlow() {
  const { type } = useParams()
  const serviceType = type === 'weee' ? 'weee' : type === 'battery' ? 'battery' : 'packaging'
  const cfg = SVC[serviceType]; const STEPS = cfg.steps
  const isPkg = serviceType === 'packaging'; const isWeee = serviceType === 'weee'

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [errors, setErrors] = useState({})
  const [bankInfo, setBankInfo] = useState(null)

  useEffect(() => { fetch('/api/bank-info').then(r => r.json()).then(setBankInfo).catch(() => {}) }, [])

  const [form, setForm] = useState({
    company_name: '', registered_address: '', registered_address_en: '', uscc: '', legal_representative: '',
    contact_person: '', contact_phone: '', wechat_id: '', contact_email: '',
    password: '', packaging_items: [], tier: 'standard',
    device_categories: [], brand_count: '1', year_type: 'first',
    signer_name: '', agreed: false,
  })

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => { const n = {...e}; delete n[k]; return n }) }
  const fe = (k) => errors[k] ? <p className="text-red-500 text-xs mt-1">{errors[k]}</p> : null

  const validate = (s) => {
    const e = {}
    if (s === 0) {
      if (!form.company_name.trim()) e.company_name = '请输入公司名称'
      if (!form.registered_address.trim()) e.registered_address = '请输入注册地址'
      if (!form.contact_person.trim()) e.contact_person = '请输入联系人'
      if (!form.contact_phone.trim()) e.contact_phone = '请输入手机号'
      if (!form.wechat_id.trim()) e.wechat_id = '请输入微信号'
      if (!form.contact_email.trim()) e.contact_email = '请输入邮箱'
      else if (!EMAIL_RE.test(form.contact_email)) e.contact_email = '邮箱格式不正确'
      if (!form.password || form.password.length < 6) e.password = '请设置登录密码（至少6位）'
    }
    if (s === 3) {
      if (!form.agreed) e.agreed = '请阅读并同意合同条款'
      if (!form.signer_name.trim()) e.signer_name = '请输入签署人姓名'
    }
    setErrors(e); return Object.keys(e).length === 0
  }

  const next = (n) => { if (validate(step)) setStep(n) }

  // Packaging
  const [ni, setNi] = useState({ material: 'plastics', category: 'B2C', kg: '' })
  const addItem = () => {
    if (!ni.kg || parseFloat(ni.kg) <= 0) { setErrors({ kg: '请输入有效的重量' }); return }
    setErrors({})
    setForm(f => ({ ...f, packaging_items: [...f.packaging_items, { material: MATERIALS.find(m => m.key === ni.material)?.label || ni.material, material_key: ni.material, category: ni.category, kg: parseFloat(ni.kg) }] }))
    setNi({ material: 'plastics', category: 'B2C', kg: '' })
  }
  const rmItem = (i) => update('packaging_items', form.packaging_items.filter((_, j) => j !== i))
  const toggleCat = (k) => { const c = form.device_categories; update('device_categories', c.includes(k) ? c.filter(x => x !== k) : [...c, k]) }

  const handleSubmit = async () => {
    if (!validate(3)) return
    setSubmitting(true)
    try {
      const body = { service_type: serviceType, company_name: form.company_name.trim(), registered_address: form.registered_address.trim(), registered_address_en: (form.registered_address_en || '').trim(), uscc: form.uscc.trim(), legal_representative: form.legal_representative.trim(), contact_person: form.contact_person.trim(), contact_phone: form.contact_phone.trim(), wechat_id: form.wechat_id.trim(), contact_email: form.contact_email.trim(), password: form.password, tier: form.tier }
      if (isPkg) body.packaging_items = form.packaging_items.map(p => ({ material_type: p.material, category: p.category, estimated_kg: p.kg }))
      else { body.device_categories = form.device_categories; body.brand_count = parseInt(form.brand_count) || 1; body.year_type = form.year_type }
      const res = await fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error || '创建合同失败')
      const sRes = await fetch(`/api/contracts/${data.contract_id}/sign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signer_name: form.signer_name.trim() }) })
      const sData = await sRes.json(); if (!sRes.ok) throw new Error(sData.error || '签名失败')
      setResult(data); setStep(4)
    } catch (e) { alert('提交失败: ' + e.message) }
    setSubmitting(false)
  }

  const reviewFee = (() => {
    if (isPkg) return AR_TIERS_LIST.find(t => t.key === form.tier)?.price || AR_TIERS.basic.feeEur
    if (isWeee) { const cats = form.device_categories.length || 1; return WEEE_PRICES.baseFee + Math.max(0, cats - 1) * (WEEE_PRICES.extraCategory || 99) + Math.max(0, (parseInt(form.brand_count) || 1) - 1) * (WEEE_PRICES.extraBrand || 79.95) + (form.year_type === 'first' ? WEEE_PRICES.authFirstYear || 50.76 : 0) }
    return BATTERY_PRICES.baseFee + Math.max(0, (parseInt(form.brand_count) || 1) - 1) * (BATTERY_PRICES.extraBrand || 49) + (form.year_type === 'first' ? BATTERY_PRICES.authFirstYear || 50.76 : 0)
  })()

  if (result) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-2xl font-extrabold mb-4">签约成功</h1>
      <div className="bg-white border border-gray-100 rounded-lg p-5 text-left space-y-2 mb-6 text-sm">
        <div className="flex justify-between"><span className="text-gray-400">服务</span><span className="font-medium">{cfg.label}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">合同编号</span><span className="font-mono font-medium">{result.contract_number}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">年费</span><span className="font-bold">€{result.annual_fee_eur}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">起始日期</span><span>{result.start_date}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">支付金额</span><span className="font-bold">¥{result.payment?.cnyAmount}</span></div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
        <p className="font-semibold text-blue-800 text-sm">🔑 账号已创建</p>
        <p className="text-xs text-blue-700 mt-1">登录邮箱：{form.contact_email}</p>
        <Link to="/login" className="inline-block mt-3 px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold">前往登录 →</Link>
      </div>
      {bankInfo && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-5 text-left text-sm">
          <h3 className="font-bold mb-2">💳 银行转账付款</h3>
          <div className="space-y-1 text-gray-600">
            <p>银行：{bankInfo.bank_name}</p><p>账户名：{bankInfo.account_name}</p>
            <p>账号：{bankInfo.account_number}</p><p>附言：{bankInfo.reference_prefix}{result.contract_number}</p>
          </div>
          <p className="text-xs text-gray-400 mt-2">{bankInfo.note}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen py-10" style={{background:'#f4f2ef'}}><div className="max-w-3xl mx-auto px-4">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-extrabold mb-1">在线签约 — {cfg.label}</h1>
        <p className="text-sm text-gray-400">{STEPS.length}步完成，约5分钟</p>
      </div>

      {/* Stepper */}
      <div className="flex justify-center mb-10">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>{i + 1}</div>
            <span className={`ml-2 text-sm hidden sm:inline ${i <= step ? 'text-primary font-medium' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`w-6 md:w-10 h-0.5 mx-1 md:mx-2 ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: §1 Vertragsparteien — Auftraggeber / Kunde */}
      {step === 0 && (
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-lg">信息：委托方 / 客户</h2>
          <p className="text-xs text-gray-400 -mt-2">Auftraggeber / Kunde</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">公司名称 / 英文 *</label>
              <input value={form.company_name} onChange={e => update('company_name', e.target.value)} className={`${inputCls} ${errCls('company_name', errors)}`} placeholder="Company name (DE/EN)" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">公司名称 / 中文 *</label>
              <input value={form.company_name} onChange={e => update('company_name', e.target.value)} className={`${inputCls} ${errCls('company_name', errors)}`} placeholder="公司全称（中文）" />
              {fe('company_name')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">注册地址 / 英文 *</label>
              <input value={form.registered_address_en || ''} onChange={e => update('registered_address_en', e.target.value)} className={inputCls} placeholder="Registered address (EN)" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">注册地址 / 中文 *</label>
              <input value={form.registered_address} onChange={e => update('registered_address', e.target.value)} className={`${inputCls} ${errCls('registered_address', errors)}`} placeholder="公司注册地址" />
              {fe('registered_address')}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-500">统一社会信用代码 / 税号</label>
            <input value={form.uscc} onChange={e => update('uscc', e.target.value)} className={inputCls} placeholder="[falls vorhanden / 如有]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">法定代表人 / 英文</label>
              <input value={form.legal_representative} onChange={e => update('legal_representative', e.target.value)} className={inputCls} placeholder="Legal representative" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">法定代表人 / 中文</label>
              <input value={form.legal_representative} onChange={e => update('legal_representative', e.target.value)} className={inputCls} placeholder="法定代表人姓名" />
              {fe('legal_representative')}
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">联系人 / 英文 *</label>
              <input value={form.contact_person} onChange={e => update('contact_person', e.target.value)} className={`${inputCls} ${errCls('contact_person', errors)}`} placeholder="Contact person" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">联系人 / 中文 *</label>
              <input value={form.contact_person} onChange={e => update('contact_person', e.target.value)} className={`${inputCls} ${errCls('contact_person', errors)}`} placeholder="联系人姓名" />
              {fe('contact_person')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">手机号 *</label>
              <input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} className={`${inputCls} ${errCls('contact_phone', errors)}`} placeholder="+86 138xxxx" />
              {fe('contact_phone')}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500">微信号 *</label>
              <input value={form.wechat_id} onChange={e => update('wechat_id', e.target.value)} className={`${inputCls} ${errCls('wechat_id', errors)}`} placeholder="WeChat ID" />
              {fe('wechat_id')}
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-500">E-Mail / 电子邮箱（用于登录）*</label>
            <input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} className={`${inputCls} ${errCls('contact_email', errors)}`} placeholder="your@email.com" />
            {fe('contact_email')}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-500">Passwort / 登录密码 *</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className={`${inputCls} ${errCls('password', errors)}`} placeholder="至少6位，用于登录Dashboard" />
            {fe('password')}
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => next(1)} disabled={!form.company_name || !form.registered_address || !form.contact_person || !form.contact_email || !form.contact_phone || !form.wechat_id || !form.password} className={btnCls}>下一步 →</button>
          </div>
        </div>
      )}

      {/* Step 1a: Packaging Declaration */}
      {step === 1 && isPkg && (
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-lg">包装申报</h2>
          <p className="text-sm text-gray-500">添加您在德国市场使用的包装类型，授权代表据此完成双元系统对接。</p>
          <div className="flex flex-wrap gap-2">
            <select value={ni.material} onChange={e => setNi(n => ({ ...n, material: e.target.value }))} className="border border-gray-200 rounded-md px-3 py-2 text-sm flex-1 min-w-[160px]">{MATERIALS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
            <select value={ni.category} onChange={e => setNi(n => ({ ...n, category: e.target.value }))} className="border border-gray-200 rounded-md px-3 py-2 text-sm w-20"><option value="B2C">B2C</option><option value="B2B">B2B</option></select>
            <input type="number" value={ni.kg} onChange={e => setNi(n => ({ ...n, kg: e.target.value }))} placeholder="kg/年" className={`border border-gray-200 rounded-md px-3 py-2 text-sm w-24 ${errors.kg ? 'border-red-400' : ''}`} />
            <button onClick={addItem} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light">+ 添加</button>
          </div>
          {errors.kg && <p className="text-red-500 text-xs">{errors.kg}</p>}
          {form.packaging_items.length > 0 && (
            <div className="space-y-2">
              {form.packaging_items.map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 rounded-md px-4 py-2.5 text-sm">
                  <span>{item.material}</span><span className="text-gray-400 text-xs">{item.category}</span><span className="font-medium">{item.kg} kg</span>
                  <button onClick={() => rmItem(i)} className="text-red-400 text-xs hover:text-red-600">删除</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(0)} className={btnGhostCls}>← 上一步</button>
            <button onClick={() => setStep(2)} className={btnCls}>下一步 →</button>
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
            <button onClick={() => setStep(0)} className={btnGhostCls}>← 上一步</button>
            <button onClick={() => setStep(2)} disabled={isWeee && form.device_categories.length === 0} className={btnCls}>下一步 →</button>
          </div>
        </div>
      )}

      {/* Step 2a: Packaging Tier */}
      {step === 2 && isPkg && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg text-center">选择服务套餐</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {AR_TIERS_LIST.map(t => (
              <button key={t.key} onClick={() => update('tier', t.key)} className={`bg-white rounded-lg p-5 text-left border-2 transition-all ${form.tier === t.key ? 'border-primary' : 'border-gray-100 hover:border-gray-200'} ${t.featured ? 'relative' : ''}`}>
                {t.featured && <span className="absolute -top-2 right-2 bg-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">推荐</span>}
                <h3 className="font-bold mb-1">{t.name.split(' ')[0]}</h3>
                <p className="text-2xl font-extrabold text-primary mb-2">€{t.price}<span className="text-sm text-gray-400 font-normal">/年</span></p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className={btnGhostCls}>← 上一步</button>
            <button onClick={() => setStep(3)} className={btnCls}>下一步 →</button>
          </div>
        </div>
      )}

      {/* Step 2b: WEEE/Battery Fee Summary */}
      {step === 2 && !isPkg && (
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-lg text-center">费用确认</h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            {isWeee && <div className="flex justify-between"><span className="text-gray-500">设备类别</span><span>{form.device_categories.length} 类</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">品牌数量</span><span>{form.brand_count}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">年份类型</span><span>{form.year_type === 'first' ? '首年' : '续年'}</span></div>
            <div className="border-t pt-2 mt-2 space-y-1">
              {isWeee && <><Row k="基础服务费" v={`€${WEEE_PRICES.baseFee}`} />{form.device_categories.length > 1 && <Row k={`额外类别 ×${form.device_categories.length - 1}`} v={`€${Math.max(0, form.device_categories.length - 1) * (WEEE_PRICES.extraCategory || 99)}`} />}{parseInt(form.brand_count) > 1 && <Row k={`额外品牌 ×${parseInt(form.brand_count) - 1}`} v={`€${Math.max(0, parseInt(form.brand_count) - 1) * (WEEE_PRICES.extraBrand || 79.95)}`} />}{form.year_type === 'first' && <Row k="首年授权费" v={`€${WEEE_PRICES.authFirstYear || 50.76}`} />}</>}
              {!isWeee && <><Row k="基础服务费" v={`€${BATTERY_PRICES.baseFee}`} />{parseInt(form.brand_count) > 1 && <Row k={`额外品牌 ×${parseInt(form.brand_count) - 1}`} v={`€${Math.max(0, parseInt(form.brand_count) - 1) * (BATTERY_PRICES.extraBrand || 49)}`} />}{form.year_type === 'first' && <Row k="首年授权费" v={`€${BATTERY_PRICES.authFirstYear || 50.76}`} />}</>}
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base"><span>预估年费</span><span className="text-primary">€{reviewFee}</span></div>
          </div>
          <p className="text-xs text-gray-400">* 最终费用以合同为准</p>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className={btnGhostCls}>← 上一步</button>
            <button onClick={() => setStep(3)} className={btnCls}>下一步 →</button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Sign */}
      {step === 3 && (
        <div className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          <h2 className="font-bold text-lg">确认并签署</h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-400">服务</span><span className="font-medium">{cfg.label}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">公司</span><span className="font-medium">{form.company_name}</span></div>
            {form.company_name_en && <div className="flex justify-between"><span className="text-gray-400">公司(EN)</span><span className="font-medium text-xs">{form.company_name_en}</span></div>}
            <div className="flex justify-between"><span className="text-gray-400">地址</span><span className="font-medium text-xs">{form.registered_address}</span></div>
            {form.uscc && <div className="flex justify-between"><span className="text-gray-400">信用代码</span><span className="font-medium text-xs">{form.uscc}</span></div>}
            {form.legal_representative && <div className="flex justify-between"><span className="text-gray-400">法定代表人 / 中文</span><span className="font-medium">{form.legal_representative}</span></div>}
            <div className="flex justify-between"><span className="text-gray-400">联系人</span><span className="font-medium">{form.contact_person}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">邮箱</span><span className="font-medium">{form.contact_email}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">手机</span><span className="font-medium">{form.contact_phone}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">微信</span><span className="font-medium">{form.wechat_id}</span></div>
            {isPkg && <><div className="flex justify-between"><span className="text-gray-400">套餐</span><span className="font-medium">{AR_TIERS_LIST.find(t => t.key === form.tier)?.name} — €{AR_TIERS_LIST.find(t => t.key === form.tier)?.price}/年</span></div><div className="flex justify-between"><span className="text-gray-400">包装类型</span><span className="font-medium">{form.packaging_items.length} 种</span></div></>}
            {isWeee && <div className="flex justify-between"><span className="text-gray-400">设备类别</span><span className="font-medium">{form.device_categories.length} 类</span></div>}
            {!isPkg && <div className="flex justify-between"><span className="text-gray-400">品牌数</span><span className="font-medium">{form.brand_count}</span></div>}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold"><span>预估年费</span><span className="text-primary">€{reviewFee}</span></div>
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.agreed} onChange={e => update('agreed', e.target.checked)} className="mt-0.5 shrink-0" />
            <span>我已阅读并同意 <a href={isPkg ? "/projects/LIVANTO/VerpackG_Bevollmächtigungsvertrag.docx" : `/projects/中国主体合同/非德国主体_${isWeee ? 'WEEE' : 'WEEE&电池法'}合同模板_Bevollmächtigungsvertrag_Kunde mit Sitz außerhalb von Deutschland_${isWeee ? 'WEEE' : 'WEEE & Batterien'}.docx`} target="_blank" className="text-primary underline font-medium">{cfg.ctLabel}</a>。德文版具有法律约束力。</span>
          </label>
          {fe('agreed')}
          <div><label className="block text-sm font-medium mb-1 text-gray-600">签署人姓名</label><input value={form.signer_name} onChange={e => update('signer_name', e.target.value)} className={`${inputCls} ${errCls('signer_name', errors)}`} placeholder="您的姓名（电子签名）" />{fe('signer_name')}</div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(2)} className={btnGhostCls}>← 上一步</button>
            <button onClick={handleSubmit} disabled={!form.agreed || !form.signer_name || submitting} className={btnCls}>{submitting ? '提交中...' : '签署并进入支付 →'}</button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

function Row({ k, v }) { return <div className="flex justify-between text-xs text-gray-500"><span>{k}</span><span>{v}</span></div> }
