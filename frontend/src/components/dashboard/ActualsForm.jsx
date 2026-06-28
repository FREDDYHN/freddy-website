import { useState } from 'react'
import { PACKAGING_MATERIALS } from '@shared/constants.js'

const MAT_NAME = Object.fromEntries(PACKAGING_MATERIALS.map(m => [m.key, m.label]))

export default function ActualsForm({ contract, packaging, onClose, onSubmit }) {
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
    actKg: v.actKg || v.estKg,
  }))

  const [items, setItems] = useState(initItems)
  const [submitting, setSubmitting] = useState(false)

  const updateKg = (mk, val) => {
    setItems(prev => prev.map(i => i.material_key === mk ? { ...i, actKg: parseFloat(val) || 0 } : i))
  }

  const totalEstKg = items.reduce((s, i) => s + i.estKg, 0)
  const totalActKg = items.reduce((s, i) => s + i.actKg, 0)
  const totalDiff = totalActKg - totalEstKg

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
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">📋 年终实际包装量申报</h3>
            <p className="text-xs text-gray-400 mt-0.5">{contract.contract_number} · {contract.start_date?.slice(0, 10)} – {contract.end_date?.slice(0, 10)}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
        </div>

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
                      <input type="number" step="0.1" min="0" value={item.actKg || ''}
                        onChange={e => updateKg(item.material_key, e.target.value)}
                        className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary tabular-nums" />
                    </td>
                    <td className={`py-2 text-right tabular-nums text-xs ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                      {diffStr}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm">
            <span className="text-gray-400">合计</span>
            <div className="text-right">
              <p>预申报 <span className="font-semibold tabular-nums">{totalEstKg.toFixed(1)} kg</span></p>
              <p>实际 <span className="font-semibold tabular-nums">{totalActKg.toFixed(1)} kg</span></p>
              <p className={`font-semibold ${totalDiff > 0 ? 'text-red-500' : totalDiff < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                差额 {totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(1)} kg
              </p>
            </div>
          </div>
        </div>

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
