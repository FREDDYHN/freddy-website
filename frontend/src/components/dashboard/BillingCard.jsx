import { useState } from 'react'
import { PACKAGING_MATERIALS } from '@shared/constants.js'

const MAT_NAME = Object.fromEntries(PACKAGING_MATERIALS.map(m => [m.key, m.label]))
const MAT_RATE = Object.fromEntries(PACKAGING_MATERIALS.map(m => [m.key, { min: m.min, max: m.max }]))

function matCost(materialKey, kg) {
  const rate = MAT_RATE[materialKey]
  if (!rate || !kg) return null
  return { min: Math.round(rate.min * kg), max: Math.round(rate.max * kg) }
}

function totalCost(items) {
  if (!items || items.length === 0) return { min: 0, max: 0 }
  let min = 0, max = 0
  for (const item of items) {
    const mk = item.material_type || item.material_key
    const kg = parseFloat(item.estimated_quantity_kg || item.kg) || 0
    const c = matCost(mk, kg)
    if (c) { min += c.min; max += c.max }
  }
  return { min, max }
}

export default function BillingCard({ contracts, packaging, payments, invoices, uploads, bankInfo, onNotifyPaid, onUpload }) {
  const [collapsed, setCollapsed] = useState(false)
  const [notifyingId, setNotifyingId] = useState(null)
  const [expandedBank, setExpandedBank] = useState(null)
  const [expandedDetail, setExpandedDetail] = useState({}) // { 'pkg_1': true, 'rec_1': true, 'settle_1': true }
  const [uploadingCid, setUploadingCid] = useState(null)

  const bank = bankInfo || {}

  const toggleDetail = (key) => setExpandedDetail(p => ({ ...p, [key]: !p[key] }))

  // ── Group data by contract_id ──
  const pkgByContract = {}
  ;(packaging || []).forEach(p => { const cid = p.contract_id; if (!pkgByContract[cid]) pkgByContract[cid] = []; pkgByContract[cid].push(p) })
  const payByContract = {}
  ;(payments || []).forEach(p => { const cid = p.contract_id; if (!payByContract[cid]) payByContract[cid] = []; payByContract[cid].push(p) })
  const invByContract = {}
  ;(invoices || []).forEach(inv => { const cid = inv.contract_id; if (!invByContract[cid]) invByContract[cid] = []; invByContract[cid].push(inv) })
  const uplByContract = {}
  ;(uploads || []).forEach(u => { const cid = u.contract_id; if (cid && !uplByContract[cid]) uplByContract[cid] = []; if (cid) uplByContract[cid].push(u) })

  const sorted = [...(contracts || [])].sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))

  const handleNotify = async (cid) => { setNotifyingId(cid); try { await onNotifyPaid(cid) } finally { setNotifyingId(null) } }
  const handleUpload = async (e, cid) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingCid(cid); try { await onUpload(file, cid) } finally { setUploadingCid(null); e.target.value = '' }
  }

  const latestContract = sorted[0]
  const collapsedSub = latestContract
    ? `${latestContract.start_date?.slice(0, 7) || ''}–${latestContract.end_date?.slice(0, 7) || ''} · ${latestContract.status === 'pending_payment' ? '年费待付' : latestContract.status === 'active' ? '进行中' : latestContract.status}`
    : '暂无合同'

  return (
    <div className="bg-white border border-gray-100 rounded-lg">
      {/* ══════ Collapsible Header ══════ */}
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50/50 transition-colors rounded-lg">
        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">💰 付费与申报</span>
        <span className="text-[11px] text-gray-400 flex-1 truncate">{collapsedSub}</span>
        <span className="text-xs text-gray-400 flex-shrink-0">{sorted.length}个周期</span>
        <span className={`text-gray-300 text-xs flex-shrink-0 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>▼</span>
      </button>

      {/* ══════ Expandable Body ══════ */}
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-[4000px]'}`}>
        <div className="px-3 pb-5 overflow-x-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-gray-300 text-xs">暂无合同数据</div>
          ) : (
            sorted.map((c, ri) => {
              const pkg = pkgByContract[c.id] || []
              const pays = payByContract[c.id] || []
              const invs = invByContract[c.id] || []
              const ups = uplByContract[c.id] || []
              const cost = totalCost(pkg)

              // AR fee
              const arStatus = c.status === 'active' ? 'paid' : c.status === 'pending_payment' ? 'pending' : c.status
              const arPaidDate = c.paid_confirmed_at?.slice(0, 10)
              const isPendingAR = c.status === 'pending_payment'

              // Recycling
              const prepaidPayment = pays.find(p => p.payment_type === 'recycling_prepaid')
              const settlementPayment = pays.find(p => p.payment_type === 'recycling_settlement')
              const proofUploads = ups.filter(u => u.file_type === 'bank_proof' || u.file_type === 'signed_contract')

              const pkgKey = `pkg_${c.id}`
              const settleKey = `settle_${c.id}`
              const bankKey = `bank_${c.id}`

              return (
                <div key={c.id} className={`border border-gray-100 rounded-lg mb-3 ${ri % 2 ? 'bg-gray-50/50' : ''}`}>
                  {/* ── Row Header ── */}
                  <div className="flex items-center gap-4 px-4 py-3 flex-wrap">
                    {/* Contract period */}
                    <div className="min-w-[140px]">
                      <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {c.start_date?.slice(0, 10) || '—'} – {c.end_date?.slice(0, 10) || '—'}
                      </p>
                      <button onClick={() => navigator.clipboard.writeText(c.contract_number)}
                        className="text-[10px] text-gray-400 hover:text-primary transition-colors" title="点击复制">
                        {c.contract_number}
                      </button>
                    </div>

                    {/* AR fee */}
                    <div className="flex items-center gap-2 min-w-[160px]">
                      <span className="text-xs text-gray-500">年费</span>
                      <span className={`text-xs font-semibold ${arStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                        €{c.annual_fee_eur} {arStatus === 'paid' ? '✓' : '待付'}
                      </span>
                      {arPaidDate && <span className="text-[10px] text-gray-400">{arPaidDate}</span>}
                      {isPendingAR && (
                        <button onClick={() => handleNotify(c.id)} disabled={notifyingId === c.id}
                          className="text-[10px] bg-primary text-white px-2 py-0.5 rounded hover:bg-primary-light disabled:opacity-50 transition-colors">
                          {notifyingId === c.id ? '...' : '通知已转账'}
                        </button>
                      )}
                    </div>

                    {/* Packaging + Recycling (combined) */}
                    <button onClick={() => toggleDetail(pkgKey)}
                      className="flex items-center gap-2 min-w-[240px] text-left hover:bg-gray-100 rounded px-2 py-1 transition-colors">
                      <span className="text-xs text-gray-500">包装申报（回收费预缴）</span>
                      <span className="text-xs font-medium text-gray-700">{pkg.length}种 · {pkg.reduce((s, i) => s + (parseFloat(i.estimated_quantity_kg || i.kg) || 0), 0)}kg</span>
                      <span className="text-xs text-gray-500">预估€{cost.min}–€{cost.max}</span>
                      {prepaidPayment?.status === 'paid'
                        ? <span className="text-[10px] text-green-600">€{prepaidPayment.amount_eur} ✓</span>
                        : <span className="text-[10px] text-yellow-600">待缴</span>}
                      <span className={`text-[10px] text-gray-300 transition-transform duration-200 ${expandedDetail[pkgKey] ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {/* Year-end settlement */}
                    <button onClick={() => toggleDetail(settleKey)}
                      className="flex items-center gap-2 min-w-[140px] text-left hover:bg-gray-100 rounded px-2 py-1 transition-colors">
                      <span className="text-xs text-gray-500">年终结算</span>
                      {settlementPayment?.status === 'paid'
                        ? <span className="text-xs font-semibold text-green-600">€{settlementPayment.amount_eur} ✓</span>
                        : <span className="text-[10px] text-gray-300">待申报</span>}
                      {invs.length > 0 && <span className="text-[10px] text-gray-400">{invs.length}张发票</span>}
                      {settlementPayment && <span className={`text-[10px] text-gray-300 transition-transform duration-200 ${expandedDetail[settleKey] ? 'rotate-180' : ''}`}>▼</span>}
                    </button>

                    {/* Bank info toggle */}
                    {isPendingAR && (
                      <button onClick={() => setExpandedBank(expandedBank === c.id ? null : c.id)}
                        className="text-[10px] text-primary hover:underline">
                        {expandedBank === c.id ? '▲' : '▼'} 银行信息
                      </button>
                    )}

                    {/* Upload proof */}
                    <div className="flex items-center gap-2 ml-auto">
                      {proofUploads.length > 0 && proofUploads.slice(0, 1).map((u, i) => (
                        <a key={u.id || i} href={`/api/uploads/${u.id}/download`}
                          className="text-[10px] text-primary hover:underline truncate max-w-[100px]" download title={u.original_name}>
                          📄 {u.original_name?.slice(0, 12)}...
                        </a>
                      ))}
                      <label className="cursor-pointer text-[10px] text-gray-400 hover:text-primary transition-colors">
                        {uploadingCid === c.id ? '...' : '📤'}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, c.id)} disabled={uploadingCid === c.id} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* ── Bank info expand ── */}
                  {expandedBank === c.id && (
                    <div className="px-4 pb-3">
                      <div className="bg-blue-50 rounded p-2.5 text-[10px] space-y-0.5">
                        {bank.account_name && <p><span className="text-gray-400">户名：</span><span className="font-medium">{bank.account_name}</span></p>}
                        {bank.bank_name && <p><span className="text-gray-400">开户行：</span>{bank.bank_name}</p>}
                        {bank.account_number && <p><span className="text-gray-400">账号：</span><span className="font-mono">{bank.account_number}</span></p>}
                        {bank.bank_code && <p><span className="text-gray-400">银行代码：</span><span className="font-mono">{bank.bank_code}</span></p>}
                        {bank.bank_address && <p><span className="text-gray-400">开户行地址：</span>{bank.bank_address}</p>}
                        <p className="text-gray-400 pt-0.5 border-t border-blue-200">附言：{bank.reference_prefix || ''}{c.contract_number}</p>
                      </div>
                    </div>
                  )}

                  {/* ══════ 包装申报 + 回收费预缴详情 ══════ */}
                  {expandedDetail[pkgKey] && pkg.length > 0 && (
                    <div className="px-4 pb-3 border-t border-gray-100">
                      <p className="text-[11px] font-medium text-gray-500 mt-3 mb-2">📦 包装申报（回收费预缴）</p>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100">
                            <th className="text-left font-normal py-1">材料类别</th>
                            <th className="text-left font-normal py-1">销售类型</th>
                            <th className="text-right font-normal py-1">预估重量 (kg)</th>
                            <th className="text-right font-normal py-1">费率 €/kg</th>
                            <th className="text-right font-normal py-1">预估费 €</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pkg.map((item, i) => {
                            const mk = item.material_type || item.material_key
                            const kg = parseFloat(item.estimated_quantity_kg || item.kg) || 0
                            const rate = MAT_RATE[mk]
                            const mc = matCost(mk, kg)
                            return (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="py-1 font-medium text-gray-700">{MAT_NAME[mk] || item.material || mk}</td>
                                <td className="py-1 text-gray-500">{item.packaging_category || item.category || '—'}</td>
                                <td className="py-1 text-right tabular-nums font-medium">{kg}</td>
                                <td className="py-1 text-right text-gray-400">{rate ? `€${rate.min}–€${rate.max}` : '—'}</td>
                                <td className="py-1 text-right tabular-nums text-gray-500">{mc ? `€${mc.min}–€${mc.max}` : '—'}</td>
                              </tr>
                            )
                          })}
                          <tr className="font-semibold">
                            <td colSpan={2} className="py-1.5 text-gray-400">合计</td>
                            <td className="py-1.5 text-right tabular-nums">{pkg.reduce((s, i) => s + (parseFloat(i.estimated_quantity_kg || i.kg) || 0), 0)} kg</td>
                            <td></td>
                            <td className="py-1.5 text-right tabular-nums text-primary">€{cost.min}–€{cost.max}</td>
                          </tr>
                        </tbody>
                      </table>
                      {prepaidPayment?.status === 'paid' && (
                        <p className="text-[10px] text-green-600 mt-2">✅ 已预缴 €{prepaidPayment.amount_eur}（{prepaidPayment.paid_at?.slice(0, 10)}）</p>
                      )}
                    </div>
                  )}

                  {/* ══════ 年终结算详情 ══════ */}
                  {expandedDetail[settleKey] && (
                    <div className="px-4 pb-3 border-t border-gray-100">
                      <p className="text-[11px] font-medium text-gray-500 mt-3 mb-2">📋 年终申报结算</p>
                      {settlementPayment ? (
                        <div className="space-y-2">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-100">
                                <th className="text-left font-normal py-1">材料</th>
                                <th className="text-right font-normal py-1">预申报 (kg)</th>
                                <th className="text-right font-normal py-1">年终实际 (kg)</th>
                                <th className="text-right font-normal py-1">差额 (kg)</th>
                                <th className="text-right font-normal py-1">结算 €</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pkg.map((item, i) => {
                                const mk = item.material_type || item.material_key
                                const estK = parseFloat(item.estimated_quantity_kg || item.kg) || 0
                                const actK = parseFloat(item.actual_quantity_kg) || 0
                                const diff = actK - estK
                                const rate = MAT_RATE[mk]
                                const diffCost = rate && diff ? Math.round(rate.max * diff) : 0
                                return (
                                  <tr key={i} className="border-b border-gray-50">
                                    <td className="py-1 font-medium text-gray-700">{MAT_NAME[mk] || mk}</td>
                                    <td className="py-1 text-right tabular-nums text-gray-500">{estK}</td>
                                    <td className="py-1 text-right tabular-nums font-medium">{actK || '—'}</td>
                                    <td className={`py-1 text-right tabular-nums ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                      {actK ? (diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0') : '—'}
                                    </td>
                                    <td className={`py-1 text-right tabular-nums font-medium ${diffCost > 0 ? 'text-red-500' : diffCost < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                      {actK ? (diffCost > 0 ? `+€${diffCost}` : diffCost < 0 ? `-€${Math.abs(diffCost)}` : '€0') : '—'}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                          <p className={`text-xs font-semibold ${settlementPayment.amount_eur > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {settlementPayment.status === 'paid'
                              ? `✅ 已结算：${settlementPayment.amount_eur > 0 ? '补缴' : '退款'} €${Math.abs(settlementPayment.amount_eur)}（${settlementPayment.paid_at?.slice(0, 10)}）`
                              : `待结算：€${settlementPayment.amount_eur}`}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-300 text-xs">
                          <p>📋 年度申报完成后将生成结算单</p>
                          <p className="mt-0.5">基于年终实际包装量与预申报量的差额结算</p>
                        </div>
                      )}
                      {invs.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <p className="text-[10px] text-gray-400 mb-1">关联发票</p>
                          {invs.map(inv => (
                            <p key={inv.id} className="text-[10px] text-gray-500">
                              {inv.invoice_number} · €{inv.amount_eur} · {inv.invoice_date?.slice(0, 10)} · <span className="text-green-500">已开具</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
