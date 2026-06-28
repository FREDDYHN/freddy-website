import { useState } from 'react'
import { PACKAGING_MATERIALS, getRecyclingRate, calcMaterialFee, applyFloorFee } from '@shared/constants.js'

const MAT_NAME = Object.fromEntries(PACKAGING_MATERIALS.map(m => [m.key, m.label]))
const MIN_FEE = 28.90

/** Quick settlement preview: totalDiff & penalty trigger */
function previewSettlement(preRawSum, actRawSum) {
  if (!actRawSum || actRawSum <= 0) return { amount: 0, note: '' }
  // Guard: actual kg increased → fee must not drop (tier-crossing)
  const guardedActRaw = Math.max(actRawSum, preRawSum)
  const totalDiff = guardedActRaw - preRawSum
  const threshold = preRawSum * 0.2
  let actTotal = guardedActRaw
  let note = ''
  if (totalDiff > threshold && threshold > 0) {
    actTotal = preRawSum + totalDiff * 1.2
    note = `超出>20%: 全部超额×1.2 (+€${(totalDiff * 0.2).toFixed(2)})`
  } else if (totalDiff > 0) {
    note = `差额≤20%: 按正常费率补缴`
  } else if (totalDiff < 0) {
    const refundable = Math.min(Math.abs(totalDiff), preRawSum * 0.1)
    actTotal = preRawSum - refundable
    note = Math.abs(totalDiff) > refundable ? `退款限10%: 仅退€${refundable.toFixed(2)}` : `退款 €${Math.abs(totalDiff).toFixed(2)}`
  }
  actTotal = applyFloorFee(actTotal, MIN_FEE)
  const preTotal = applyFloorFee(preRawSum, MIN_FEE)
  const settle = Math.round((actTotal - preTotal) * 100) / 100
  return { amount: settle, note }
}

export default function ActualsForm({ contract, packaging, onClose, onSubmit }) {
  // Group by material, prefill actual from existing data or estimated
  const matMap = {}
  ;(packaging || []).forEach(p => {
    const mk = p.material_type || p.material_key
    if (!matMap[mk]) matMap[mk] = { estKg: 0, actKg: 0 }
    matMap[mk].estKg += parseFloat(p.estimated_quantity_kg || p.kg) || 0
    matMap[mk].actKg += parseFloat(p.actual_quantity_kg) || 0
  })

  const initItems = Object.entries(matMap).map(([mk, v]) => ({
    material_key: mk,
    material_label: MAT_NAME[mk] || mk,
    estKg: v.estKg,
    actKg: v.actKg || v.estKg, // default to estimated
  }))

  const [items, setItems] = useState(initItems)
  const [submitting, setSubmitting] = useState(false)

  const updateKg = (mk, val) => {
    setItems(prev => prev.map(i => i.material_key === mk ? { ...i, actKg: parseFloat(val) || 0 } : i))
  }

  // Real-time preview
  let preRawSum = 0, actRawSum = 0
  items.forEach(i => {
    const preRate = getRecyclingRate(i.material_key, i.estKg)
    const preFee = i.estKg * preRate
    preRawSum += preFee
    const actRate = getRecyclingRate(i.material_key, Math.max(i.estKg, i.actKg))
    // Guard: if kg increased, fee must not drop (tier-crossing)
    actRawSum += Math.max(i.actKg * actRate, i.actKg > i.estKg ? preFee : 0)
  })
  const preview = previewSettlement(preRawSum, actRawSum)
  const preTotal = applyFloorFee(preRawSum, MIN_FEE)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = { items: items.map(i => ({ material_type: i.material_key, actual_kg: i.actKg })) }
      const token = sessionStorage.getItem('token')
      const r = await fetch(`/api/contracts/${contract.id}/submit-actuals`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      onSubmit()
    } catch (e) {
      alert('提交失败: ' + e.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">📋 年终实际包装量申报</h3>
            <p className="text-xs text-gray-400 mt-0.5">{contract.contract_number} · {contract.start_date?.slice(0, 10)} – {contract.end_date?.slice(0, 10)}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 text-xs">
                <th className="text-left font-normal py-2">材料</th>
                <th className="text-right font-normal py-2 w-24">预申报 kg</th>
                <th className="text-right font-normal py-2 w-28">实际 kg</th>
                <th className="text-right font-normal py-2 w-20">差额</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const diff = item.actKg - item.estKg
                const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff < 0 ? diff.toFixed(1) : '0'
                return (
                  <tr key={item.material_key} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-700">{item.material_label}</td>
                    <td className="py-2 text-right tabular-nums text-gray-500">{item.estKg.toFixed(1)}</td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={item.actKg || ''}
                        onChange={e => updateKg(item.material_key, e.target.value)}
                        className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary tabular-nums"
                      />
                    </td>
                    <td className={`py-2 text-right tabular-nums text-xs ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                      {diffStr}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">预申报合计</span><span className="font-semibold">€{preTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">实际合计（未含罚则）</span><span className="font-semibold">€{actRawSum.toFixed(2)}</span></div>
            {preview.note && <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">{preview.note}</p>}
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-600 font-semibold">预估结算</span>
              <span className={`font-bold ${preview.amount > 0 ? 'text-red-500' : preview.amount < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                {preview.amount > 0 ? `补缴 €${preview.amount.toFixed(2)}` : preview.amount < 0 ? `退款 €${Math.abs(preview.amount).toFixed(2)}` : '€0'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors">
            {submitting ? '提交中...' : '✅ 确认提交'}
          </button>
        </div>
      </div>
    </div>
  )
}
