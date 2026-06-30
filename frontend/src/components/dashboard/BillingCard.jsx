import { useState, useEffect } from 'react'
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
  const [rate, setRate] = useState(8.10)
  useEffect(() => { fetch('/api/rate').then(r => r.json()).then(d => d.rate && setRate(d.rate)).catch(() => {}) }, [])
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
    var rawDiff = actFee - prepaidCalc; var penaltyApplies = rawDiff > prepaidCalc * 0.2 && prepaidCalc > 0; var refundApplies = rawDiff < 0; var penaltyAmt = penaltyApplies ? rawDiff * 0.2 : 0; var refundCapped = refundApplies ? -Math.min(Math.abs(rawDiff), prepaidCalc * 0.1) : 0; var settleAmt = hasAnyActuals ? (penaltyApplies ? rawDiff * 1.2 : refundApplies ? refundCapped : rawDiff) : 0;
    var settleRows = []; var allMats = new Set(); Object.keys(byMat).forEach(function(k){ allMats.add(k) }); Object.keys(actByMat).forEach(function(k){ allMats.add(k) });
    allMats.forEach(function(mk){
      var mat = PACKAGING_MATERIALS.find(function(m){ return m.key === mk });
      var estKg = byMat[mk] || 0, actKg = actByMat[mk] || 0;
      var rate = mat ? (function getR(mk, kg){ var m2 = PACKAGING_MATERIALS.find(function(x){ return x.key === mk }); if(!m2) return 0; for(var i=0;i<m2.tiers.length;i++){ if(kg<=m2.tiers[i].toKg) return m2.tiers[i].rate } return m2.tiers[m2.tiers.length-1].rate })(mk, Math.max(estKg, actKg)) : 0;
      var estFee = calcMaterialFee(mk, estKg), actFee1 = calcMaterialFee(mk, actKg);
      settleRows.push({ label: (mat ? mat.label : mk), estKg: estKg, actKg: actKg, exKg: actKg - estKg, rate: rate, diff: actFee1 - estFee });
    })
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
    h += '.grid{display:grid;grid-template-columns:180px 1fr;gap:24px}.settle-section{margin-top:20px}.bank-section{margin-top:20px;padding-top:16px;border-top:2px solid #e0e0e0}.bank-section h3{font-size:12px;color:#555;margin-bottom:6px}.bank-section p{font-size:11px;color:#888;margin:2px 0;line-height:1.6}.tbl{width:100%;border-collapse:collapse;font-size:12px}.tbl th{color:#666;font-weight:500;border-bottom:2px solid #ccc;padding:5px 8px;text-align:right}.tbl th:first-child{text-align:left}.tbl td{padding:5px 8px;border-bottom:1px solid #f0f0f0;text-align:right}.tbl td:first-child{text-align:left}.tbl .total-row td{border-top:2px solid #ccc;font-weight:700}</style></head><body>'
    h += '<h2>'+esc(c.company_name||'')+'</h2><p class="sub">'+esc(c.contract_number)+' · '+esc(tierName)+' · '+(c.start_date?.slice(0,10)||'-')+' - '+(c.end_date?.slice(0,10)||'-')+'</p>'
    h += '<div class="grid">'
    h += '<div><h3>授权代表年费</h3><p>服务等级 <b>'+esc(tierName)+'</b></p><p>截止日期 '+(c.end_date?.slice(0,10)||'-')+'</p><p>状态 <span class="'+(c.status==='active'?'g':'y')+'">'+(c.status==='active'?'已付款':'待付款')+'</span></p><p>金额 <b class="b">€'+c.annual_fee_eur+'</b></p><p style="font-size:10px;color:#888">约 ¥'+Math.round(c.annual_fee_eur * rate)+'</p></div>'
    h += '<div><h3>回收费预申报</h3><table>'
    rows.forEach(function(r){ h += '<tr><td>'+esc(r.label)+'</td><td class="num">'+r.kg+'kg</td><td class="num">€'+r.rate+'</td><td class="num">€'+r.fee.toFixed(2)+'</td></tr>' })
    h += '<tr><td colspan="3">小计 · '+totalKg+'kg</td><td class="num"><b>€'+subtotal.toFixed(2)+'</b></td></tr>'
    if(prepaidCalc>subtotal) h += '<tr><td colspan="3" class="y">取起步价</td><td class="num y"><b>€'+prepaidCalc.toFixed(2)+'</b></td></tr>'
    h += '</table><p class="b">预申报费 €'+prepaidDisplay.toFixed(2)+' '+(prepaidPayment?.status==='paid'?'✓':'')+'</p>'
    h += '<p style="font-size:10px;color:#888">≈ ¥'+Math.round(prepaidDisplay * rate)+'</p>'
    if(prepaidOverride) h += '<p class="s">报价表 €'+prepaidCalc.toFixed(2)+'</p>'
    h += '</div>' // close prepaid div
    h += '</div>' // close grid
    h += '<div class="settle-section"><h3>年终结算 — 材料明细对比</h3>'
    if(hasAnyActuals){
      h += '<table class="tbl"><thead><tr><th>材料类别</th><th>申报量(kg)</th><th>实际量(kg)</th><th>超额(kg)</th><th>费率(€/kg)</th><th>差额(€)</th></tr></thead><tbody>'
      settleRows.forEach(function(r){
        h += '<tr><td>'+esc(r.label)+'</td><td>'+r.estKg.toFixed(1)+'</td><td>'+r.actKg.toFixed(1)+'</td>'
        h += '<td class="'+(r.exKg>0?'r':r.exKg<0?'g':'')+'">'+(r.exKg>0?'+':'')+r.exKg.toFixed(1)+'</td>'
        h += '<td>€'+r.rate.toFixed(4)+'</td>'
        h += '<td class="'+(r.diff>0?'r':r.diff<0?'g':'')+'">'+(r.diff>0?'+':'')+'€'+r.diff.toFixed(2)+'</td></tr>'
      })
      var totalActKg = settleRows.reduce(function(s,r){ return s+r.actKg }, 0)
      var totalExKg = settleRows.reduce(function(s,r){ return s+r.exKg }, 0)
      var totalRawDiff = settleRows.reduce(function(s,r){ return s+r.diff }, 0)
      h += '<tr class="total-row"><td><b>合计</b></td><td><b>'+totalKg.toFixed(1)+'</b></td><td><b>'+totalActKg.toFixed(1)+'</b></td><td class="'+(totalExKg>0?'r':'g')+'"><b>'+(totalExKg>0?'+':'')+totalExKg.toFixed(1)+'</b></td><td></td><td class="'+(totalRawDiff>0?'r':'g')+'"><b>'+(totalRawDiff>0?'+':'')+'€'+totalRawDiff.toFixed(2)+'</b></td></tr>'
      h += '</tbody></table>'
      h += '<div style="margin-top:12px;padding:12px;background:#f8f9fa;border-radius:6px;font-size:12px">'
      h += '<p>申报费总计 <b>€'+prepaidCalc.toFixed(2)+'</b> &nbsp;|&nbsp; 实际费总计 <b>€'+actFee.toFixed(2)+'</b></p>'
      h += '<p>基础差额 <span class="'+(rawDiff>0?'r':'g')+'"><b>'+(rawDiff>0?'+':'')+'€'+rawDiff.toFixed(2)+'</b></span></p>'
      if(penaltyApplies) h += '<p class="r">+ 惩罚金 (合同 §5(3) 20%附加费) <b>€'+penaltyAmt.toFixed(2)+'</b></p>'
      if(refundApplies && Math.abs(rawDiff) > prepaidCalc * 0.1) h += '<p class="y">退款上限10%: 仅退 €'+Math.abs(refundCapped).toFixed(2)+'</p>'
      h += '<p class="b" style="font-size:14px">'+(settleAmt>0?'补缴合计':'退款合计')+' €'+settleDisplay.toFixed(2)+' '+(settlementPayment?.status==='paid'?'✓ 已付清':'')+'</p>'
      h += '<p style="font-size:10px;color:#888">约 ¥'+Math.round(settleDisplay * rate)+'</p>'
      if(settleOverride) h += '<p class="s">公式值 €'+settleAmt.toFixed(2)+'</p>'
      h += '</div>'
    } else { h += '<p style="color:#999">暂无实际数据</p>' }
    h += '</div>'
    h += '<div class="bank-section"><h3>银行转账信息</h3>'
    h += '<table style="font-size:11px;color:#666;line-height:1.8"><tr><td style="padding-right:20px;white-space:nowrap">开户行：</td><td>中国银行股份有限公司淮南分行</td></tr>'
    h += '<tr><td>银行地址：</td><td>安徽省淮南市龙湖路21号</td></tr>'
    h += '<tr><td>银行代码：</td><td>BKCHCNBJ780</td></tr>'
    h += '<tr><td>户名：</td><td>福瑞笛（上海）信息咨询有限公司淮南分公司</td></tr>'
    h += '<tr><td>账号：</td><td><b>181276312093</b></td></tr>'
    h += '<tr><td>附言：</td><td>EPR-'+(c.contract_number||'')+'</td></tr></table>'
    h += '<p style="font-size:10px;color:#999;margin-top:6px">请在转账附言中注明合同编号，以便快速确认到账。</p></div>'
    h += '</body></html>'
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
                      <span className="text-[9px] text-gray-350 mt-0.5">≈ ¥{Math.round(c.annual_fee_eur * rate)}</span>
                      <label className="cursor-pointer text-[10px] text-gray-400 hover:text-primary mt-0.5">
                        上传付款凭证 <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, c.id, 'proof_annual_fee')} disabled={uploadingCid === c.id} className="hidden" />
                      </label>
                    </span>
                    <span className="flex flex-col">
                      <span className="text-xs text-gray-700 h-[18px] flex items-center">
                        <span className={`font-semibold ${prepaidPayment?.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>€{(prepaidPayment?.amount_eur || cost).toFixed(2)}</span>
                        <span className={`font-semibold ml-1 ${prepaidPayment?.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{prepaidPayment?.status === 'paid' ? '✓' : '待缴'}</span>
                      </span>
                      <span className="text-[9px] text-gray-350 mt-0.5">≈ ¥{Math.round((prepaidPayment?.amount_eur || cost) * rate)}</span>
                      <label className="cursor-pointer text-[10px] text-gray-400 hover:text-primary mt-0.5">
                        上传付款凭证 <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, c.id, 'proof_prepaid')} disabled={uploadingCid === c.id} className="hidden" />
                      </label>
                    </span>
                    <span className="flex flex-col">
                      {settlementPayment?.status === 'paid' && settlementPayment.amount_eur > 0 ? (
                        <>
                        <span className="text-xs text-green-600 font-semibold h-[18px] flex items-center">€{settlementPayment.amount_eur} ✓</span>
                        <span className="text-[9px] text-gray-350 mt-0.5">≈ ¥{Math.round(settlementPayment.amount_eur * rate)}</span>
                        </>
                      ) : settlementPayment && settlementPayment.amount_eur > 0 ? (
                        <>
                        <span className="text-xs text-yellow-600 font-semibold h-[18px] flex items-center">€{settlementPayment.amount_eur} 待缴</span>
                        <span className="text-[9px] text-gray-350 mt-0.5">≈ ¥{Math.round(settlementPayment.amount_eur * rate)}</span>
                        </>
                      ) : pkg.some(p => p.submitted_at) ? (
                        (() => { const actByMat = {}; pkg.forEach(item => { const mk = item.material_type || item.material_key; const ak = parseFloat(item.actual_quantity_kg) || 0; if (ak > 0) actByMat[mk] = (actByMat[mk] || 0) + ak }); let af = 0; Object.entries(actByMat).forEach(([mk, kg]) => { af += calcMaterialFee(mk, kg) }); af = applyFloorFee(af, 28.90); const s = calcTotalSettlement(cost, af); return s.amount > 0 ? <><span className="text-xs text-red-500 font-semibold h-[18px] flex items-center">补缴 €{s.amount.toFixed(2)}</span><span className="text-[9px] text-gray-350 mt-0.5">≈ ¥{Math.round(s.amount * rate)}</span></> : s.amount < 0 ? <><span className="text-xs text-green-600 font-semibold h-[18px] flex items-center">退 €{Math.abs(s.amount).toFixed(2)}</span><span className="text-[9px] text-gray-350 mt-0.5">≈ ¥{Math.round(Math.abs(s.amount) * rate)}</span></> : <span className="text-xs text-blue-500 h-[18px] flex items-center">已申报</span> })()
                      ) : (
                        <button onClick={() => setActualsCid(c.id)} className="text-primary hover:underline font-semibold text-xs h-[18px] flex items-center">申报实际量</button>
                      )}
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
