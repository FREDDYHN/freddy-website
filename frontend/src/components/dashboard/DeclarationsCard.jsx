import { PACKAGING_MATERIALS } from '@shared/constants.js'

const MAT_NAME = Object.fromEntries(PACKAGING_MATERIALS.map(m => [m.key, m.label]))

function estimateRecyclingCost(packaging) {
  if (!packaging || packaging.length === 0) return { min: 0, max: 0 }
  let minTotal = 0, maxTotal = 0
  for (const item of packaging) {
    const mat = PACKAGING_MATERIALS.find(m => m.key === item.material_type)
    const kg = parseFloat(item.estimated_quantity_kg) || parseFloat(item.kg) || 0
    if (mat) {
      minTotal += mat.min * kg
      maxTotal += mat.max * kg
    }
  }
  return { min: minTotal, max: maxTotal }
}

export default function DeclarationsCard({ packaging, invoices }) {
  const hasPackaging = packaging && packaging.length > 0
  const hasInvoices = invoices && invoices.length > 0
  const recycling = estimateRecyclingCost(packaging)

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 space-y-5">
      <h3 className="font-semibold text-sm text-gray-700">📊 申报与账单</h3>

      {/* Packaging declarations */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2">包装材料申报</h4>
        {hasPackaging ? (
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 px-3 py-2 text-[10px] text-gray-400 font-medium border-b border-gray-100">
              <span>材料</span><span>类别</span><span className="text-right">预估年量</span>
            </div>
            {packaging.slice(0, 10).map((item, i) => (
              <div key={item.id || i} className="grid grid-cols-3 px-3 py-1.5 text-xs border-b border-gray-50 last:border-0">
                <span className="font-medium text-gray-700 truncate">{MAT_NAME[item.material_type] || item.material_type || item.material || '—'}</span>
                <span className="text-gray-500">{item.packaging_category || item.category || '—'}</span>
                <span className="text-right tabular-nums font-medium">{(item.estimated_quantity_kg || item.kg || '—')} kg</span>
              </div>
            ))}
            {packaging.length > 10 && (
              <p className="text-center text-[10px] text-gray-400 py-1.5">... 还有 {packaging.length - 10} 项</p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-300 text-xs bg-gray-50 rounded-lg">
            <p>📦 暂无申报数据</p>
          </div>
        )}
      </div>

      {/* Recycling fee estimate */}
      {hasPackaging && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">回收费预估（双元系统）</h4>
          <div className="bg-green-50 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-400">基于当前申报量估算</p>
              <p className="text-xs text-gray-600 mt-0.5">实际费用以双元系统账单为准</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-green-700">€{recycling.min.toFixed(0)} – €{recycling.max.toFixed(0)}</p>
              <p className="text-[10px] text-gray-400">每年</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">* 预缴制：按预估量预缴，年底按实际量多退少补</p>
        </div>
      )}

      {/* Invoices */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2">发票记录</h4>
        {hasInvoices ? (
          <div className="space-y-1.5">
            {invoices.slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex justify-between items-center bg-gray-50 rounded px-3 py-2 text-xs">
                <div>
                  <span className="font-mono text-gray-600">{inv.invoice_number}</span>
                  <span className="text-gray-400 ml-2">{inv.invoice_date?.slice(0, 10)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">€{inv.amount_eur}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${inv.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {inv.status === 'issued' ? '已开具' : inv.status}
                  </span>
                </div>
              </div>
            ))}
            {invoices.length > 5 && (
              <p className="text-center text-[10px] text-gray-400">... 还有 {invoices.length - 5} 条</p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-300 text-xs bg-gray-50 rounded-lg">
            <p>🧾 暂无发票</p>
            <p className="mt-0.5">付款确认后将自动开具发票</p>
          </div>
        )}
      </div>
    </div>
  )
}
