import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PACKAGING_MATERIALS, AR_TIERS, EMAIL_RE } from '@shared/constants.js'

const MATERIALS = PACKAGING_MATERIALS

const TIERS = Object.values(AR_TIERS).map(t => ({
  key: t.key,
  name: t.name,
  price: t.feeEur,
  color: t.color,
  desc: t.key === 'basic'
    ? '核心AR服务：系统参与、LUCID数据申报、官方通信'
    : t.key === 'standard'
    ? '基础+优先响应(48h)+扩展分类咨询+年度合规简报'
    : '标准+完整性声明协调+专属客户经理+24h响应',
  featured: t.featured || false,
}))

const STEPS = ['公司信息', '包装申报', '套餐选择', '预览签署']

export default function SignupFlow() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    company_name: '', contact_name: '', contact_email: '', contact_phone: '', wechat_id: '',
    packaging_items: [], tier: 'standard',
    signer_name: '', agreed: false,
  })

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    // Clear field error on change
    if (errors[k]) setErrors(e => { const n = {...e}; delete n[k]; return n })
  }

  // ── Validation ──
  const validateStep = (stepNum) => {
    const errs = {}
    if (stepNum === 0) {
      if (!form.company_name.trim()) errs.company_name = '请输入公司名称'
      if (!form.contact_name.trim()) errs.contact_name = '请输入联系人姓名'
      if (!form.contact_email.trim()) {
        errs.contact_email = '请输入邮箱'
      } else if (!EMAIL_RE.test(form.contact_email)) {
        errs.contact_email = '邮箱格式不正确'
      }
    }
    if (stepNum === 3) {
      if (!form.agreed) errs.agreed = '请阅读并同意授权代表合同'
      if (!form.signer_name.trim()) errs.signer_name = '请输入签署人姓名'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = (next) => {
    if (!validateStep(step)) return
    setStep(next)
  }

  // Step 2: Add packaging item
  const [newItem, setNewItem] = useState({ material: 'plastics', category: 'B2C', kg: '' })
  const addItem = () => {
    if (!newItem.kg || parseFloat(newItem.kg) <= 0) {
      setErrors({ kg: '请输入有效的重量' })
      return
    }
    setErrors({})
    setForm(f => ({
      ...f,
      packaging_items: [...f.packaging_items, {
        material: MATERIALS.find(m => m.key === newItem.material)?.label || newItem.material,
        material_key: newItem.material,
        category: newItem.category,
        kg: parseFloat(newItem.kg)
      }]
    }))
    setNewItem({ material: 'plastics', category: 'B2C', kg: '' })
  }
  const removeItem = (i) => update('packaging_items', form.packaging_items.filter((_, j) => j !== i))

  const handleSubmit = async () => {
    if (!validateStep(3)) return
    setSubmitting(true)
    try {
      const body = {
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone.trim(),
        wechat_id: form.wechat_id.trim(),
        packaging_items: form.packaging_items.map(p => ({
          material_type: p.material, category: p.category, estimated_kg: p.kg
        })),
        tier: form.tier,
      }
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '创建合同失败')

      const signRes = await fetch(`/api/contracts/${data.contract_id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signer_name: form.signer_name.trim() }),
      })
      const signData = await signRes.json()
      if (!signRes.ok) throw new Error(signData.error || '签名失败')

      setResult(data)
      setStep(4)
    } catch (e) {
      alert('提交失败: ' + e.message)
    }
    setSubmitting(false)
  }

  const selectedTier = TIERS.find(t => t.key === form.tier)

  // Done state
  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-4">签约成功！</h1>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left space-y-3 mb-8">
          <p><strong>合同编号：</strong>{result.contract_number}</p>
          <p><strong>年费：</strong>€{result.annual_fee_eur}</p>
          <p><strong>起始日期：</strong>{result.start_date}</p>
          <p><strong>支付金额：</strong>¥{result.payment?.cnyAmount}</p>
          {result.payment?.payUrl && (
            <a href={result.payment.payUrl} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-4 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold">
              去支付 →
            </a>
          )}
        </div>
        <p className="text-sm text-gray-500">
          支付完成后合同即激活。我们将向 {form.contact_email} 发送合同PDF和LUCID注册指南。
        </p>
      </div>
    )
  }

  const fieldError = (key) => errors[key]
    ? <p className="text-red-500 text-xs mt-0.5">{errors[key]}</p>
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-2">在线签约 — 包装法授权代表</h1>
      <p className="text-center text-gray-500 mb-8">4步完成，约5分钟</p>

      {/* Stepper */}
      <div className="flex justify-center mb-10">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              i <= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
            }`}>{i + 1}</div>
            <span className={`ml-2 text-sm ${i <= step ? 'text-primary font-medium' : 'text-gray-400'}`}>{s}</span>
            {i < 3 && (
              <div className="w-8 md:w-16 h-0.5 mx-2 bg-gray-200">
                <div className={`h-full transition-all ${i < step ? 'bg-primary' : ''}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Company Info */}
      {step === 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold">公司信息</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">公司名称 *</label>
              <input value={form.company_name} onChange={e => update('company_name', e.target.value)}
                className={`w-full border rounded-lg p-2 text-sm ${errors.company_name ? 'border-red-400' : ''}`}
                placeholder="您的公司全称" />
              {fieldError('company_name')}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">联系人 *</label>
              <input value={form.contact_name} onChange={e => update('contact_name', e.target.value)}
                className={`w-full border rounded-lg p-2 text-sm ${errors.contact_name ? 'border-red-400' : ''}`}
                placeholder="姓名" />
              {fieldError('contact_name')}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">电子邮箱 *</label>
              <input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)}
                className={`w-full border rounded-lg p-2 text-sm ${errors.contact_email ? 'border-red-400' : ''}`}
                placeholder="用于接收合同PDF" />
              {fieldError('contact_email')}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">手机号</label>
              <input value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">微信号</label>
              <input value={form.wechat_id} onChange={e => update('wechat_id', e.target.value)}
                className="w-full border rounded-lg p-2 text-sm" placeholder="选填" />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={() => nextStep(1)}
              disabled={!form.company_name || !form.contact_name || !form.contact_email}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50">
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Packaging Declaration */}
      {step === 1 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold">包装申报</h2>
          <p className="text-sm text-gray-500">请添加您在德国市场使用的所有包装类型。</p>
          <div className="flex flex-wrap gap-2">
            <select value={newItem.material} onChange={e => setNewItem(n => ({ ...n, material: e.target.value }))}
              className="border rounded-lg p-2 text-sm flex-1 min-w-[200px]">
              {MATERIALS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <select value={newItem.category} onChange={e => setNewItem(n => ({ ...n, category: e.target.value }))}
              className="border rounded-lg p-2 text-sm w-24">
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
            <input type="number" value={newItem.kg} onChange={e => setNewItem(n => ({ ...n, kg: e.target.value }))}
              placeholder="公斤/年" className={`border rounded-lg p-2 text-sm w-28 ${errors.kg ? 'border-red-400' : ''}`} />
            <button onClick={addItem} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">+ 添加</button>
          </div>
          {errors.kg && <p className="text-red-500 text-xs">{errors.kg}</p>}
          {form.packaging_items.length > 0 && (
            <div className="mt-4 space-y-2">
              {form.packaging_items.map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 rounded-lg p-3 text-sm">
                  <span>{item.material}</span>
                  <span className="text-gray-500">{item.category}</span>
                  <span className="font-medium">{item.kg} kg</span>
                  <button onClick={() => removeItem(i)} className="text-red-500 text-xs">删除</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(0)} className="px-4 py-2 border rounded-lg text-sm">← 上一步</button>
            <button onClick={() => setStep(2)} className="px-6 py-2 bg-primary text-white rounded-lg font-medium">下一步 →</button>
          </div>
        </div>
      )}

      {/* Step 3: Tier Selection */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-center">选择服务套餐</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {TIERS.map(t => (
              <button key={t.key} onClick={() => update('tier', t.key)}
                className={`bg-white rounded-xl p-6 text-left border-2 transition-all ${
                  form.tier === t.key ? 'border-primary ring-2 ring-primary/20' : t.color
                } ${t.featured ? 'relative' : ''}`}>
                {t.featured && (
                  <span className="absolute -top-2 right-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">推荐</span>
                )}
                <h3 className="font-bold text-lg mb-1">{t.name}</h3>
                <p className="text-2xl font-bold text-primary mb-3">€{t.price}<span className="text-sm text-gray-400">/年</span></p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm">← 上一步</button>
            <button onClick={() => setStep(3)} className="px-6 py-2 bg-primary text-white rounded-lg font-medium">下一步 →</button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Sign */}
      {step === 3 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-lg font-bold">确认并签署</h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between"><span>公司</span><span className="font-medium">{form.company_name}</span></div>
            <div className="flex justify-between"><span>联系人</span><span className="font-medium">{form.contact_name}</span></div>
            <div className="flex justify-between"><span>邮箱</span><span className="font-medium">{form.contact_email}</span></div>
            <div className="flex justify-between"><span>套餐</span><span className="font-medium">{selectedTier?.name} — €{selectedTier?.price}/年</span></div>
            <div className="flex justify-between"><span>包装类型</span><span className="font-medium">{form.packaging_items.length} 种</span></div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold"><span>预估年费</span><span>€{selectedTier?.price}</span></div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={form.agreed} onChange={e => update('agreed', e.target.checked)} className="mt-0.5" />
            <span>我已阅读并同意 <a href="/projects/contracts/LIVANTO/Bevollmächtigungsvertrag_03.docx" className="text-primary underline">授权代表合同</a>（德文版本具有法律约束力，中文版本仅供参考）</span>
          </label>
          {fieldError('agreed')}
          <div>
            <label className="block text-sm font-medium mb-1">签署人姓名</label>
            <input value={form.signer_name} onChange={e => update('signer_name', e.target.value)}
              className={`w-full border rounded-lg p-2 text-sm ${errors.signer_name ? 'border-red-400' : ''}`}
              placeholder="请输入您的姓名作为电子签名" />
            {fieldError('signer_name')}
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-lg text-sm">← 上一步</button>
            <button onClick={handleSubmit}
              disabled={!form.agreed || !form.signer_name || submitting}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50">
              {submitting ? '提交中...' : '签署并进入支付 →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
