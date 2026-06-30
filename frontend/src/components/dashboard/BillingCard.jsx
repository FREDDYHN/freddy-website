import { useState } from 'react'
import { PACKAGING_MATERIALS, getRecyclingRate, calcMaterialFee, applyFloorFee } from '@shared/constants.js'
import ActualsForm from './ActualsForm'

const MAT_NAME = Object.fromEntries(PACKAGING_MATERIALS.map(m => [m.key, m.label]))
const MIN_FEE = 28.90

function totalRecyclingCost(items) {
  if (!items || items.length === 0) return 0
  const byMat = {}
  for (const item of items) { const mk = item.material_type || item.material_key; const kg = parseFloat(item.estimated_quantity_kg || item.kg) || 0; byMat[mk] = (byMat[mk] || 0) + kg }
  let total = 0; for (const [mk, kg] of Object.entries(byMat)) total += calcMaterialFee(mk, kg)
  return applyFloorFee(total, MIN_FEE)
}

/** Apply contract §5(3) penalty/refund rules to EUR fee amounts:
 *  - Actual > declared +20%: 20% surcharge on excess
 *  - Actual < declared: refund capped at 10% of declared
 *  All params in EUR.
 */
function calcTotalSettlement(preFee, actFee) {
  if (!actFee || actFee <= 0) return { amount: 0, note: '待申报' }
  const diff = actFee - preFee
  const threshold = preFee * 0.2
  let settle = diff
  let note = ''
  if (diff > threshold && threshold > 0) {
    settle = diff * 1.2
    note = `超出>20%: 超额€${diff.toFixed(2)} × 1.2 = €${settle.toFixed(2)}`
  } else if (diff > 0) {
    note = `差额≤20%: 按正常费率`
  } else if (diff < 0) {
    const refundLimit = preFee * 0.1
    const refundable = Math.min(Math.abs(diff), refundLimit)
    settle = -refundable
    note = Math.abs(diff) > refundLimit ? `退款限10%: 仅退€${refundable.toFixed(2)}` : `退款: €${Math.abs(diff).toFixed(2)}`
  }
  return { amount: Math.round(settle * 100) / 100, note }
}

/** Deadline helpers */
function arDeadline(contract) {
  if (!contract) return ''
  // Due 14 days after contract start, or immediately if pending
  if (contract.status === 'pending_payment') return '请尽快支付以激活合同'
  if (contract.paid_confirmed_at) return `已付 · ${contract.paid_confirmed_at.slice(0, 10)}`
  return `截止 ${contract.start_date?.slice(0, 10) || ''}`
}

function reportingDeadline(contract) {
  // §5(2): March 1 of following year
  if (!contract?.start_date) return '次年3月1日'
  const y = parseInt(contract.start_date.slice(0, 4))
  return `${y + 1}-03-01`
}

export default function BillingCard({ contracts, packaging, payments, invoices, uploads, bankInfo, onUpload }) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedDetail, setExpandedDetail] = useState({})
  const [uploadingCid, setUploadingCid] = useState(null)
  const [actualsCid, setActualsCid] = useState(null)

  const toggleDetail = (key) => setExpandedDetail(p => ({ ...p, [key]: !p[key] }))

  const pkgByContract = {}; (packaging || []).forEach(p => { const cid = p.contract_id; if (!pkgByContract[cid]) pkgByContract[cid] = []; pkgByContract[cid].push(p) })
  const payByContract = {}; (payments || []).forEach(p => { const cid = p.contract_id; if (!payByContract[cid]) payByContract[cid] = []; payByContract[cid].push(p) })
  const invByContract = {}; (invoices || []).forEach(inv => { const cid = inv.contract_id; if (!invByContract[cid]) invByContract[cid] = []; invByContract[cid].push(inv) })
  const uplByContract = {}; (uploads || []).forEach(u => { const cid = u.contract_id; if (cid && !uplByContract[cid]) uplByContract[cid] = []; if (cid) uplByContract[cid].push(u) })

  const sorted = [...(contracts || [])].sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))

  const handleUpload = async (e, cid, ft) => { const file = e.target.files?.[0]; if (!file) return; setUploadingCid(cid); try { await onUpload(file, cid, ft) } finally { setUploadingCid(null); e.target.value = '' } }

  const latestContract = sorted[0]
  const collapsedSub = latestContract
    ? `${latestContract.start_date?.slice(0, 7) || ''}–${latestContract.end_date?.slice(0, 7) || ''} · ${latestContract.status === 'pending_payment' ? '年费待付' : latestContract.status === 'active' ? '进行中' : latestContract.status}`
    : '暂无合同'

  return (
    <div className="bg-white border border-gray-100 rounded-lg">
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50/50 transition-colors rounded-lg">
        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">💰 付费与申报</span>
        <span className="text-[11px] text-gray-400 flex-1 truncate">{collapsedSub}</span>
        <span className="text-xs text-gray-400 flex-shrink-0">{sorted.length}个周期</span>
        <span className={`text-gray-300 text-xs flex-shrink-0 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>▼</span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-[6000px]'}`}>
        <div className="px-3 pb-5 space-y-4">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-gray-300 text-xs">暂无合同数据</div>
          ) : (
            <>
            {/* Column Headers */}
            <div className="grid px-4 py-2 text-xs text-gray-500 font-bold border-b border-gray-200" style={{gridTemplateColumns:'200px 180px 180px 180px'}}>
              <span>合同周期 / 合同号</span>
              <span>授权代表年费</span>
              <span>预申报费</span>
              <span>年终结算</span>
            </div>
            {sorted.map((c, ri) => {
            const pkg = pkgByContract[c.id] || []
            const pays = payByContract[c.id] || []
            const invs = invByContract[c.id] || []
            const ups = uplByContract[c.id] || []
            const cost = totalRecyclingCost(pkg)
            const detailKey = `detail_${c.id}`
            const expanded = expandedDetail[detailKey]

            // Fee statuses
            const isPendingAR = c.status === 'pending_payment'
            const arDeadlineStr = arDeadline(c)
            const reportDeadline = reportingDeadline(c)
            const prepaidPayment = pays.find(p => p.payment_type === 'recycling_prepaid')
            const settlementPayment = pays.find(p => p.payment_type === 'recycling_settlement')
            const proofUploads = ups.filter(u => u.file_type?.startsWith('proof_') || u.file_type === 'bank_proof' || u.file_type === 'signed_contract')

            // Material group for settlement
            const matKg = {}; pkg.forEach(item => { const mk = item.material_type || item.material_key; matKg[mk] = (matKg[mk] || 0) + (parseFloat(item.estimated_quantity_kg || item.kg) || 0) })

            return (
              <div key={c.id} className={`border border-gray-100 rounded-lg ${ri % 2 ? 'bg-gray-50/50' : ''}`}>
                {/* ── Row Summary ── */}
                <div className="px-4 py-3">
                  {/* Line 1: Grid aligned with headers */}
                  <div className="grid items-start" style={{gridTemplateColumns:'200px 180px 180px 180px'}}>
                    <button onClick={() => { navigator.clipboard.writeText(c.contract_number); toggleDetail(detailKey) }}
                      className="text-xs font-semibold text-gray-700 hover:text-primary transition-colors text-left"
                      title="点击复制合同号 · 展开明细">
                      {c.start_date?.slice(0, 10) || '—'} – {c.end_date?.slice(0, 10) || '—'}
                      <span className="block text-[10px] text-gray-600 font-semibold mt-0.5">{c.contract_number} 明细 <span className={`transition-transform duration-200 inline-block ${expanded ? 'rotate-180' : ''}`}>▼</span></span>
                    </button>
                    <span className="flex flex-col">
                      <span className="text-xs text-gray-700 h-[18px] flex items-center">
                        <span className={`font-semibold ${isPendingAR ? 'text-yellow-600' : 'text-green-600'}`}>€{c.annual_fee_eur}</span>
                        <span className={`font-semibold ml-1 ${isPendingAR ? 'text-yellow-600' : 'text-green-600'}`}>{isPendingAR ? (proofUploads.length > 0 ? '待确认' : '待付') : '✓'}</span>
                      </span>
                      <label className="cursor-pointer text-[10px] text-gray-400 hover:text-primary mt-0.5">
                        上传付款凭证 <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, c.id, 'proof_annual_fee')} disabled={uploadingCid === c.id} className="hidden" />
                      </label>
                    </span>
                    <span className="flex flex-col">
                      <span className="text-xs text-gray-700 h-[18px] flex items-center">
                        <span className={`font-semibold ${prepaidPayment?.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>€{(prepaidPayment?.amount_eur || cost).toFixed(2)}</span>
                        <span className={`font-semibold ml-1 ${prepaidPayment?.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{prepaidPayment?.status === 'paid' ? '✓' : '待缴'}</span>
                      </span>
                      <label className="cursor-pointer text-[10px] text-gray-400 hover:text-primary mt-0.5">
                        上传付款凭证 <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, c.id, 'proof_prepaid')} disabled={uploadingCid === c.id} className="hidden" />
                      </label>
                    </span>
                    <span className="flex flex-col">
                      <span className="h-[18px] flex items-center">
                        {settlementPayment?.status === 'paid' && settlementPayment.amount_eur > 0 ? (
                          <span className="font-semibold text-green-600 text-xs">€{settlementPayment.amount_eur} ✓</span>
                        ) : settlementPayment && settlementPayment.amount_eur > 0 ? (
                          <span className="font-semibold text-yellow-600 text-xs">€{settlementPayment.amount_eur} 待缴</span>
                        ) : pkg.some(p => p.submitted_at) ? (
                          (() => { const actByMat = {}; pkg.forEach(item => { const mk = item.material_type || item.material_key; const ak = parseFloat(item.actual_quantity_kg) || 0; if (ak > 0) actByMat[mk] = (actByMat[mk] || 0) + ak }); let af = 0; Object.entries(actByMat).forEach(([mk, kg]) => { af += calcMaterialFee(mk, kg) }); af = applyFloorFee(af, 28.90); const s = calcTotalSettlement(cost, af); return s.amount > 0 ? <span className="font-semibold text-red-500 text-xs">补缴 €{s.amount.toFixed(2)}</span> : s.amount < 0 ? <span className="font-semibold text-green-600 text-xs">退 €{Math.abs(s.amount).toFixed(2)}</span> : <span className="text-blue-500 text-xs">已申报</span> })()
                        ) : (
                          <button onClick={() => setActualsCid(c.id)} className="text-primary hover:underline font-semibold text-xs">申报实际量</button>
                        )}
                      </span>
                      <label className="cursor-pointer text-[10px] text-gray-400 hover:text-primary mt-0.5">
                        上传付款凭证 <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, c.id, 'proof_settlement')} disabled={uploadingCid === c.id} className="hidden" />
                      </label>
                    </span>
                  </div>
                </div>

                {/* ══════ Expandable Detail ══════ */}
                {expanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 space-y-4">
                    {/* ── ① AR Fee ── */}
                    <div>
                      <h4 className="text-[11px] font-semibold text-gray-600 mt-3 mb-2">① 授权代表年费</h4>
                      <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between"><span className="text-gray-400">服务等级</span><span className="font-medium">{c.tier === 'basic' ? '基础 €89/年' : c.tier === 'standard' ? '标准 €159/年' : c.tier === 'premium' ? '高级 €249/年' : c.tier}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">合同周期</span><span>{c.start_date?.slice(0, 10)} – {c.end_date?.slice(0, 10)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">支付状态</span><span className={isPendingAR ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>{isPendingAR ? '待付款' : '已付款'}</span></div>
                        {c.paid_confirmed_at && <div className="flex justify-between"><span className="text-gray-400">确认日期</span><span>{c.paid_confirmed_at.slice(0, 10)}</span></div>}
                        <div className="flex justify-between pt-1 border-t border-gray-100"><span className="text-gray-400">年费金额</span><span className="font-bold text-primary">€{c.annual_fee_eur}</span></div>
                      </div>
                    </div>

                    {/* ── ②③ Side by side ── */}
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* ── ② Packaging Declaration ── */}
                      <div>
                        <h4 className="text-[11px] font-semibold text-gray-600 mb-2">回收费预申报</h4>
                        <p className="text-[10px] text-gray-400 mb-2">截止日期：{reportDeadline}（合同§5(2)）</p>
                        {pkg.length > 0 ? (
                          <>
                          {(() => {
                            const byMat = {}; pkg.forEach(item => { const mk = item.material_type || item.material_key; const kg = parseFloat(item.estimated_quantity_kg || item.kg) || 0; byMat[mk] = (byMat[mk] || 0) + kg })
                            let subtotal = 0; let totalKg = 0
                            const rows = Object.entries(byMat).map(([mk, kg]) => {
                              const mat = PACKAGING_MATERIALS.find(m => m.key === mk)
                              const rate = mat ? getRecyclingRate(mk, kg) : 0
                              const fee = calcMaterialFee(mk, kg)
                              subtotal += fee; totalKg += kg
                              return { label: (mat ? mat.label : mk), kg, rate, fee }
                            })
                            const final = applyFloorFee(subtotal, 28.90)
                            const wasFloored = final > subtotal
                            return (<>
                              <table className="w-full text-[11px]">
                                <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left font-normal py-1">材料类别</th><th className="text-right font-normal py-1">kg</th><th className="text-right font-normal py-1">单价</th><th className="text-right font-normal py-1">金额</th></tr></thead>
                                <tbody>
                                  {rows.map((r, i) => (<tr key={i} className="border-b border-gray-50"><td className="py-1 font-medium text-gray-700">{r.label}</td><td className="py-1 text-right tabular-nums">{r.kg}</td><td className="py-1 text-right tabular-nums text-gray-400">€{r.rate}</td><td className="py-1 text-right tabular-nums font-medium">€{r.fee.toFixed(2)}</td></tr>))}
                                  <tr className="border-t border-gray-200"><td className="py-1.5 text-gray-400">小计 · {totalKg} kg</td><td className="py-1.5"></td><td className="py-1.5"></td><td className="py-1.5 text-right tabular-nums font-semibold">€{subtotal.toFixed(2)}</td></tr>
                                  {wasFloored && <tr><td colSpan={3} className="py-1 text-yellow-600 text-right">起步价</td><td className="py-1 text-right tabular-nums text-yellow-600 font-semibold">€{final.toFixed(2)}</td></tr>}
                                </tbody>
                              </table>
                              {prepaidPayment && prepaidPayment.amount_eur > 0 && Math.abs(prepaidPayment.amount_eur - final) > 0.01 && (
                                <div className="mt-2 pt-2 border-t border-gray-100 text-[11px]">
                                  <p className="text-gray-400">报价表计算：<span className="line-through">€{final.toFixed(2)}</span></p>
                                  <p className="font-semibold text-primary">实际收费：€{prepaidPayment.amount_eur.toFixed(2)}</p>
                                </div>
                              )}
                            </>)
                          })()}
                          </>
                        ) : <p className="text-xs text-gray-300 text-center py-4">暂无申报数据</p>}
                        {prepaidPayment?.status === 'paid' && <p className="text-[10px] text-green-600 mt-2">✅ 已预缴 €{prepaidPayment.amount_eur}（{prepaidPayment.paid_at?.slice(0, 10)}）</p>}
                      </div>

                      {/* ── ③ Year-end Settlement ── */}
                      <div>
                        <h4 className="text-[11px] font-semibold text-gray-600 mb-2">③ 年终结算</h4>
                        <p className="text-[10px] text-gray-400 mb-2">截止日期：{reportDeadline} · 合同§5(3): 超出&gt;20%加收20%附加费 · 低于仅退10%内差额</p>
                        {pkg.length > 0 ? (
                          <>
                          <table className="w-full text-[11px]">
                            <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left font-normal py-1">材料</th><th className="text-right font-normal py-1">预申报kg</th><th className="text-right font-normal py-1">实际kg</th><th className="text-right font-normal py-1">差额</th><th className="text-right font-normal py-1">单价</th><th className="text-right font-normal py-1">实际费</th></tr></thead>
                            <tbody>
                              {pkg.map((item, i) => {
                                const mk = item.material_type || item.material_key
                                const estK = parseFloat(item.estimated_quantity_kg || item.kg) || 0
                                const actK = parseFloat(item.actual_quantity_kg) || 0
                                const diffKg = actK ? Math.round((actK - estK) * 100) / 100 : 0
                                const diffStr = actK ? (diffKg > 0 ? `+${diffKg}` : diffKg < 0 ? `${diffKg}` : '0') : '—'
                                const rate = getRecyclingRate(mk, actK || estK)
                                const fee = actK ? calcMaterialFee(mk, actK) : 0
                                return <tr key={i} className="border-b border-gray-50"><td className="py-1 font-medium text-gray-700">{MAT_NAME[mk] || mk}</td><td className="py-1 text-right tabular-nums text-gray-500">{estK}</td><td className="py-1 text-right tabular-nums font-medium">{actK || '—'}</td><td className={`py-1 text-right tabular-nums ${diffKg > 0 ? 'text-red-500' : diffKg < 0 ? 'text-green-500' : 'text-gray-400'}`}>{diffStr}</td><td className="py-1 text-right tabular-nums text-gray-400">€{rate}</td><td className="py-1 text-right tabular-nums font-medium">€{fee.toFixed(2)}</td></tr>
                              })}
                            </tbody>
                          </table>
                          {(() => {
                            const actByMat = {}; pkg.forEach(item => { const mk = item.material_type || item.material_key; const ak = parseFloat(item.actual_quantity_kg) || 0; if (ak > 0) actByMat[mk] = (actByMat[mk] || 0) + ak })
                            const hasAnyActuals = Object.keys(actByMat).length > 0
                            let actFee = 0; if (hasAnyActuals) { Object.entries(actByMat).forEach(([mk, kg]) => { actFee += calcMaterialFee(mk, kg) }); actFee = applyFloorFee(actFee, 28.90) }
                            const calcSettlement = hasAnyActuals ? calcTotalSettlement(cost, actFee) : null
                            const calcAmount = calcSettlement?.amount || 0
                            const hasOverride = settlementPayment && Math.abs(settlementPayment.amount_eur - calcAmount) > 0.01
                            return (<>
                              {hasAnyActuals && (
                                <div className="text-[10px] space-y-0.5 mt-2 pt-2 border-t border-gray-100">
                                  <p className="flex justify-between"><span>实际费（起步价€28.90）</span><span className="tabular-nums font-semibold">€{actFee.toFixed(2)}</span></p>
                                  <p className="flex justify-between"><span>预申报费</span><span className="tabular-nums">€{cost.toFixed(2)}</span></p>
                                  <p className="flex justify-between"><span>差额</span><span className={`tabular-nums ${(actFee - cost) > 0 ? 'text-red-500' : 'text-green-600'}`}>{(actFee - cost) > 0 ? '+' : ''}€{(actFee - cost).toFixed(2)}</span></p>
                                  {calcSettlement?.note && <p className="text-gray-400">{calcSettlement.note}</p>}
                                  <p className="flex justify-between font-bold text-primary text-[11px]"><span>{calcAmount > 0 ? '补缴' : calcAmount < 0 ? '退款' : '结算'}</span><span className="tabular-nums">€{Math.abs(calcAmount).toFixed(2)}</span></p>
                                </div>
                              )}
                              {settlementPayment?.status === 'paid' ? (
                                <p className={`text-xs font-semibold mt-2 ${settlementPayment.amount_eur > 0 ? 'text-red-500' : 'text-green-600'}`}>✅ 已{settlementPayment.amount_eur > 0 ? '补缴' : '退款'} €{Math.abs(settlementPayment.amount_eur)}（{settlementPayment.paid_at?.slice(0, 10) || ''}）</p>
                              ) : settlementPayment && !settlementPayment.status?.startsWith('paid') ? (
                                <p className="text-xs text-yellow-600 mt-2">待缴 €{settlementPayment.amount_eur}</p>
                              ) : null}
                              {hasOverride && (
                                <div className="mt-1 pt-1 border-t border-gray-100 text-[10px]">
                                  <p className="text-gray-400">公式计算：<span className="line-through">€{calcAmount.toFixed(2)}</span></p>
                                  <p className="font-semibold text-primary">实际收费：€{settlementPayment.amount_eur.toFixed(2)}</p>
                                </div>
                              )}
                            </>)
                          })()}
                          </>
                        ) : <p className="text-xs text-gray-300 text-center py-4">暂无申报数据</p>}
                        {invs.length > 0 && <div className="mt-2 pt-2 border-t border-gray-100">{invs.map(inv => <p key={inv.id} className="text-[10px] text-gray-500">{inv.invoice_number} · €{inv.amount_eur} · {inv.invoice_date?.slice(0, 10)} · <span className="text-green-500">已开具</span></p>)}</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          </>
        )}
        </div>
      </div>

      {/* Actuals Form Modal */}
      {actualsCid && (
        <ActualsForm
          contract={sorted.find(c => c.id === actualsCid)}
          packaging={pkgByContract[actualsCid] || []}
          onClose={() => setActualsCid(null)}
          onSubmit={() => window.location.reload()}
        />
      )}
    </div>
  )
}
