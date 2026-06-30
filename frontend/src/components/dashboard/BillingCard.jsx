import { useState } from 'react'
import { PACKAGING_MATERIALS, getRecyclingRate, calcMaterialFee, applyFloorFee } from '@shared/constants.js'
import ActualsForm from './ActualsForm'

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

export default function BillingCard({ contracts, packaging, payments, uploads, onUpload }) {
  const [collapsed, setCollapsed] = useState(false)
  const [uploadingCid, setUploadingCid] = useState(null)
  const [actualsCid, setActualsCid] = useState(null)
  const pkgByContract = {}; (packaging || []).forEach(p => { const cid = p.contract_id; if (!pkgByContract[cid]) pkgByContract[cid] = []; pkgByContract[cid].push(p) })
  const payByContract = {}; (payments || []).forEach(p => { const cid = p.contract_id; if (!payByContract[cid]) payByContract[cid] = []; payByContract[cid].push(p) })
  const uplByContract = {}; (uploads || []).forEach(u => { const cid = u.contract_id; if (cid && !uplByContract[cid]) uplByContract[cid] = []; if (cid) uplByContract[cid].push(u) })

  const sorted = [...(contracts || [])].sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))

  const handleUpload = async (e, cid, ft) => { const file = e.target.files?.[0]; if (!file) return; setUploadingCid(cid); try { await onUpload(file, cid, ft) } finally { setUploadingCid(null); e.target.value = '' } }

  const openFeeDetail = (c, cost, pkg, prepaidPayment, settlementPayment) => {
    const byMat = {}; pkg.forEach(function(item){ var mk = item.material_type || item.material_key; byMat[mk] = (byMat[mk] || 0) + (parseFloat(item.estimated_quantity_kg || item.kg) || 0) })
    var subtotal = 0, totalKg = 0
    var rows = Object.entries(byMat).map(function(_ref){ var mk = _ref[0], kg = _ref[1]; var mat = PACKAGING_MATERIALS.find(function(m){ return m.key === mk }); var rate = mat ? getRecyclingRate(mk, kg) : 0; var fee = calcMaterialFee(mk, kg); subtotal += fee; totalKg += kg; return { label: (mat ? mat.label : mk), kg: kg, rate: rate, fee: fee } })
    var prepaidCalc = applyFloorFee(subtotal, 28.90)
    var actByMat = {}; pkg.forEach(function(item){ var mk = item.material_type || item.material_key; var ak = parseFloat(item.actual_quantity_kg) || 0; if(ak > 0) actByMat[mk] = (actByMat[mk] || 0) + ak })
    var actFee = 0; Object.entries(actByMat).forEach(function(_ref2){ var mk = _ref2[0], kg = _ref2[1]; actFee += calcMaterialFee(mk, kg) }); actFee = applyFloorFee(actFee, 28.90)
    var hasAnyActuals = Object.keys(actByMat).length > 0
    var rawDiff = actFee - prepaidCalc; var penaltyApplies = rawDiff > prepaidCalc * 0.2 && prepaidCalc > 0; var refundApplies = rawDiff < 0; var penaltyAmt = penaltyApplies ? rawDiff * 0.2 : 0; var refundCapped = refundApplies ? -Math.min(Math.abs(rawDiff), prepaidCalc * 0.1) : 0; var settleAmt = hasAnyActuals ? (penaltyApplies ? rawDiff * 1.2 : refundApplies ? refundCapped : rawDiff) : 0
    var esc = function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
    var tierName = c.tier==='basic'?'基础 €89/年':c.tier==='standard'?'标准 €159/年':'高级 €249/年'
    var prepaidDisplay = prepaidPayment?.amount_eur || prepaidCalc
    var settleDisplay = settlementPayment?.amount_eur || Math.abs(settleAmt)
    var prepaidOverride = prepaidPayment?.amount_eur > 0 && Math.abs(prepaidPayment.amount_eur - prepaidCalc) > 0.01
    var settleOverride = settlementPayment?.amount_eur > 0 && hasAnyActuals && Math.abs(settlementPayment.amount_eur - settleAmt) > 0.01
    var h = ''; h += '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>缴费明细 - '+esc(c.company_name||'')+'</title><style>'
    h += 'body{font:13px "PingFang SC","Microsoft YaHei",sans-serif;padding:24px;max-width:960px;margin:0 auto;color:#333}'
    h += 'h2{font-size:16px;margin:0 0 4px}.sub{color:#888;font-size:12px;margin-bottom:16px}h3{font-size:13px;margin:16px 0 8px;color:#555}'
    h += 'table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:4px 8px}th{color:#888;font-weight:400;border-bottom:1px solid #e0e0e0}td{border-bottom:1px solid #f0f0f0}'
    h += '.num{text-align:right}.r{color:#c00}.g{color:#0a0}.b{font-weight:700;color:#1a3a5f}.s{text-decoration:line-through;color:#999}.y{color:#b8860b}'
    h += '.grid{display:grid;grid-template-columns:180px 1fr 1fr;gap:24px}</style></head><body>'
    h += '<h2>'+esc(c.company_name||'')+'</h2><p class="sub">'+esc(c.contract_number)+' · '+esc(tierName)+' · '+(c.start_date?.slice(0,10)||'-')+' - '+(c.end_date?.slice(0,10)||'-')+'</p>'
    h += '<div class="grid">'
    h += '<div><h3>授权代表年费</h3><p>服务等级 <b>'+esc(tierName)+'</b></p><p>截止日期 '+(c.end_date?.slice(0,10)||'-')+'</p><p>状态 <span class="'+(c.status==='active'?'g':'y')+'">'+(c.status==='active'?'已付款':'待付款')+'</span></p><p>金额 <b class="b">€'+c.annual_fee_eur+'</b></p></div>'
    h += '<div><h3>回收费预申报</h3><table>'
    rows.forEach(function(r){ h += '<tr><td>'+esc(r.label)+'</td><td class="num">'+r.kg+'kg</td><td class="num">€'+r.rate+'</td><td class="num">€'+r.fee.toFixed(2)+'</td></tr>' })
    h += '<tr><td colspan="3">小计 · '+totalKg+'kg</td><td class="num"><b>€'+subtotal.toFixed(2)+'</b></td></tr>'
    if(prepaidCalc>subtotal) h += '<tr><td colspan="3" class="y">取起步价</td><td class="num y"><b>€'+prepaidCalc.toFixed(2)+'</b></td></tr>'
    h += '</table><p class="b">预申报费 €'+prepaidDisplay.toFixed(2)+' '+(prepaidPayment?.status==='paid'?'✓':'')+'</p>'
    if(prepaidOverride) h += '<p class="s">报价表 €'+prepaidCalc.toFixed(2)+'</p>'
    h += '</div><div><h3>年终结算</h3>'
    if(hasAnyActuals){
      h += '<p>实际费 <b>€'+actFee.toFixed(2)+'</b></p><p>预申报费 €'+prepaidCalc.toFixed(2)+'</p>'
      h += '<p>基础差额 <span class="'+(rawDiff>0?'r':'g')+'">'+(rawDiff>0?'+':'')+'€'+rawDiff.toFixed(2)+'</span></p>'
      if(penaltyApplies) h += '<p class="r">+ 惩罚金 (20%附加费 §5(3)) <b>€'+penaltyAmt.toFixed(2)+'</b></p>'
      if(refundApplies && Math.abs(rawDiff) > prepaidCalc * 0.1) h += '<p class="y">退款上限10%: 仅退€'+Math.abs(refundCapped).toFixed(2)+'</p>'
      h += '<p class="b">'+(settleAmt>0?'补缴合计':'退款合计')+' €'+settleDisplay.toFixed(2)+' '+(settlementPayment?.status==='paid'?'✓':'')+'</p>'
      if(settleOverride) h += '<p class="s">公式 €'+settleAmt.toFixed(2)+'</p>'
    } else { h += '<p style="color:#999">暂无实际数据</p>' }
    h += '</div></div></body></html>'
    var w = window.open('','_blank','width=1020,height=700')
    if(w){ w.document.write(h); w.document.close() }
  }

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
            <div className="grid px-4 py-2 text-xs text-gray-500 font-bold border-b border-gray-200" style={{gridTemplateColumns:'1fr 0.8fr 1fr 1fr 1fr'}}>
              <span>合同号</span>
              <span>服务周期</span>
              <span>授权代表年费</span>
              <span>预申报费</span>
              <span>年终结算</span>
            </div>
            {sorted.map((c, ri) => {
            const pkg = pkgByContract[c.id] || []
            const pays = payByContract[c.id] || []
            const ups = uplByContract[c.id] || []
            const cost = totalRecyclingCost(pkg)

            // Fee statuses
            const isPendingAR = c.status === 'pending_payment'
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
                  <div className="grid items-start" style={{gridTemplateColumns:'1fr 0.8fr 1fr 1fr 1fr'}}>
                    <div className="flex flex-col">
                      <span className="h-[18px] flex items-center">
                        <button onClick={() => navigator.clipboard.writeText(c.contract_number)}
                          className="text-xs font-semibold text-gray-700 hover:text-primary transition-colors text-left"
                          title="点击复制合同号">{c.contract_number}</button>
                      </span>
                      <button onClick={() => openFeeDetail(c, cost, pkg, prepaidPayment, settlementPayment)}
                        className="text-[10px] text-gray-400 hover:text-primary mt-0.5 text-left">📊 费用明细</button>
                    </div>
                    <span className="flex flex-col">
                      <span className="text-[10px] text-gray-500 h-[18px] flex items-center">开始：{c.start_date?.slice(0,10)||'—'}</span>
                      <span className="text-[10px] text-gray-500 h-[18px] flex items-center mt-0.5">结束：{c.end_date?.slice(0,10)||'—'}</span>
                    </span>
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
              </div>
            )
          })}
          </>
        )}

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
    </div>
  </div>
  )
}
