import { useState, useRef } from 'react'
import { PACKAGING_MATERIALS } from '@shared/constants.js'

const MAT_NAME = Object.fromEntries(PACKAGING_MATERIALS.map(m => [m.key, m.label]))

function estimateRecycling(items) {
  if (!items || items.length === 0) return { min: 0, max: 0 }
  let min = 0, max = 0
  for (const item of items) {
    const mat = PACKAGING_MATERIALS.find(m => m.key === (item.material_type || item.material_key))
    const kg = parseFloat(item.estimated_quantity_kg || item.kg) || 0
    if (mat) { min += mat.min * kg; max += mat.max * kg }
  }
  return { min: Math.round(min), max: Math.round(max) }
}

function pkgSummary(items) {
  if (!items || items.length === 0) return '—'
  const first = items.slice(0, 3).map(i => `${MAT_NAME[i.material_type || i.material_key] || i.material || '?'} ${i.packaging_category || i.category || ''} ${i.estimated_quantity_kg || i.kg || 0}kg`).join(' · ')
  return items.length > 3 ? `${first} 等${items.length}项` : first
}

export default function BillingCard({ contracts, packaging, payments, invoices, uploads, bankInfo, onNotifyPaid, onUpload }) {
  const [collapsed, setCollapsed] = useState(false)
  const [notifyingId, setNotifyingId] = useState(null)
  const [expandedBank, setExpandedBank] = useState(null)
  const fileRef = useRef(null)
  const [uploadingCid, setUploadingCid] = useState(null)

  const bank = bankInfo || {}

  // ── Group data by contract_id ──
  const pkgByContract = {}
  ;(packaging || []).forEach(p => { const cid = p.contract_id; if (!pkgByContract[cid]) pkgByContract[cid] = []; pkgByContract[cid].push(p) })

  const payByContract = {}
  ;(payments || []).forEach(p => { const cid = p.contract_id; if (!payByContract[cid]) payByContract[cid] = []; payByContract[cid].push(p) })

  const invByContract = {}
  ;(invoices || []).forEach(inv => { const cid = inv.contract_id; if (!invByContract[cid]) invByContract[cid] = []; invByContract[cid].push(inv) })

  const uplByContract = {}
  ;(uploads || []).forEach(u => { const cid = u.contract_id; if (cid && !uplByContract[cid]) uplByContract[cid] = []; if (cid) uplByContract[cid].push(u) })

  // Sort contracts newest first
  const sorted = [...(contracts || [])].sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))

  const handleNotify = async (cid) => {
    setNotifyingId(cid)
    try { await onNotifyPaid(cid) } finally { setNotifyingId(null) }
  }

  const handleUpload = async (e, cid) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingCid(cid)
    try { await onUpload(file, cid) } finally { setUploadingCid(null); e.target.value = '' }
  }

  // ── Row render helper ──
  const renderCell = (label, value, status, date, action) => (
    <div className="min-w-0">
      {label && <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>}
      <p className={`text-xs font-medium ${status === 'paid' || status === 'done' ? 'text-green-600' : status === 'pending' ? 'text-yellow-600' : 'text-gray-600'}`}>
        {value}
      </p>
      {date && <p className="text-[10px] text-gray-400 mt-0.5">{date}</p>}
      {action}
    </div>
  )

  // ── Collapsed summary ──
  const latestContract = sorted[0]
  const latestPkg = latestContract ? pkgByContract[latestContract.id] || [] : []
  const collapsedSub = latestContract
    ? `${latestContract.start_date?.slice(0, 7) || ''}–${latestContract.end_date?.slice(0, 7) || ''} · ${latestContract.status === 'pending_payment' ? '年费待付' : latestContract.status === 'active' ? '进行中' : latestContract.status}`
    : '暂无合同'

  return (
    <div className="bg-white border border-gray-100 rounded-lg">
      {/* ══════ Collapsible Header ══════ */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50/50 transition-colors rounded-lg"
      >
        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">💰 付费与申报</span>
        <span className="text-[11px] text-gray-400 flex-1 truncate">{collapsedSub}</span>
        <span className="text-xs text-gray-400 flex-shrink-0">{sorted.length}个周期</span>
        <span className={`text-gray-300 text-xs flex-shrink-0 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>▼</span>
      </button>

      {/* ══════ Expandable Table ══════ */}
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-[2000px]'}`}>
        <div className="px-5 pb-5 overflow-x-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-gray-300 text-xs">暂无合同数据</div>
          ) : (
            <table className="w-full text-xs border-collapse">
              {/* Header */}
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="text-left font-medium py-2 pr-3 whitespace-nowrap">合同周期</th>
                  <th className="text-left font-medium py-2 px-3 whitespace-nowrap">授权代表年费</th>
                  <th className="text-left font-medium py-2 px-3 whitespace-nowrap">包装申报</th>
                  <th className="text-left font-medium py-2 px-3 whitespace-nowrap">回收费预缴</th>
                  <th className="text-left font-medium py-2 px-3 whitespace-nowrap">年终结算</th>
                  <th className="text-left font-medium py-2 pl-3 whitespace-nowrap">转账凭证</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c, ri) => {
                  const pkg = pkgByContract[c.id] || []
                  const pays = payByContract[c.id] || []
                  const invs = invByContract[c.id] || []
                  const ups = uplByContract[c.id] || []

                  // AR fee payment
                  const arPayment = pays.find(p => p.payment_type === 'annual_fee' || !p.payment_type)
                  const arStatus = c.status === 'active' ? 'paid' : c.status === 'pending_payment' ? 'pending' : c.status
                  const arPaidDate = arPayment?.paid_at?.slice(0, 10) || c.paid_confirmed_at?.slice(0, 10)

                  // Recycling prepaid
                  const recycling = estimateRecycling(pkg)
                  const prepaidPayment = pays.find(p => p.payment_type === 'recycling_prepaid')
                  const prepaidStatus = prepaidPayment?.status === 'paid' ? 'paid' : !prepaidPayment ? 'pending' : 'pending'
                  const prepaidAmount = prepaidPayment?.amount_eur

                  // Year-end settlement
                  const settlementPayment = pays.find(p => p.payment_type === 'recycling_settlement')
                  const settlementStatus = settlementPayment?.status === 'paid' ? 'paid' : !settlementPayment ? 'pending' : 'pending'

                  // Bank transfer proof uploads for this contract
                  const proofUploads = ups.filter(u => u.file_type === 'bank_proof' || u.file_type === 'signed_contract')

                  const isPendingAR = c.status === 'pending_payment'
                  const showBank = expandedBank === c.id

                  return (
                    <tr key={c.id} className={`border-b border-gray-50 align-top ${ri % 2 ? 'bg-gray-50/50' : ''}`}>
                      {/* 合同周期 */}
                      <td className="py-3 pr-3 min-w-[120px]">
                        <p className="font-medium text-gray-700 whitespace-nowrap">
                          {c.start_date?.slice(0, 10) || '—'} – {c.end_date?.slice(0, 10) || '—'}
                        </p>
                        <button
                          onClick={() => navigator.clipboard.writeText(c.contract_number)}
                          className="text-[10px] text-gray-400 hover:text-primary transition-colors mt-0.5"
                          title="点击复制"
                        >
                          {c.contract_number}
                        </button>
                      </td>

                      {/* 授权代表年费 */}
                      <td className="py-3 px-3 min-w-[140px]">
                        <p className={`text-xs font-medium ${arStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                          €{c.annual_fee_eur} {arStatus === 'paid' ? '✓' : '待付'}
                        </p>
                        {arPaidDate && <p className="text-[10px] text-gray-400 mt-0.5">{arPaidDate}</p>}
                        {isPendingAR && (
                          <div className="mt-1.5 space-y-1">
                            <button
                              onClick={() => handleNotify(c.id)}
                              disabled={notifyingId === c.id}
                              className="text-[10px] bg-primary text-white px-2 py-1 rounded hover:bg-primary-light disabled:opacity-50 transition-colors"
                            >
                              {notifyingId === c.id ? '...' : '通知已转账'}
                            </button>
                            <button
                              onClick={() => setExpandedBank(showBank ? null : c.id)}
                              className="text-[10px] text-primary hover:underline block"
                            >
                              {showBank ? '▲' : '▼'} 银行信息
                            </button>
                            {showBank && (
                              <div className="bg-blue-50 rounded p-2 text-[10px] space-y-0.5 mt-1">
                                {bank.bank_name && <p><span className="text-gray-400">银行：</span>{bank.bank_name}</p>}
                                {bank.account_name && <p><span className="text-gray-400">户名：</span>{bank.account_name}</p>}
                                {bank.account_number && <p><span className="text-gray-400">账号：</span><span className="font-mono">{bank.account_number}</span></p>}
                                {bank.swift && <p><span className="text-gray-400">SWIFT：</span>{bank.swift}</p>}
                                <p className="text-gray-400">附言：{bank.reference_prefix || ''}{c.contract_number}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 包装申报 */}
                      <td className="py-3 px-3 min-w-[160px]">
                        <p className="text-xs text-gray-600 leading-relaxed">{pkgSummary(pkg)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{pkg.length}种材料</p>
                      </td>

                      {/* 回收费预缴 */}
                      <td className="py-3 px-3 min-w-[100px]">
                        <p className="text-xs text-gray-500">预估 €{recycling.min}–€{recycling.max}</p>
                        {prepaidPayment ? (
                          <p className={`text-xs font-medium mt-0.5 ${prepaidStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {prepaidStatus === 'paid' ? `€${prepaidAmount} ✓` : '待缴'}
                          </p>
                        ) : (
                          <p className="text-[10px] text-gray-300 mt-0.5">待生成</p>
                        )}
                      </td>

                      {/* 年终结算 */}
                      <td className="py-3 px-3 min-w-[80px]">
                        {settlementPayment ? (
                          <p className={`text-xs font-medium ${settlementStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {settlementStatus === 'paid' ? `€${settlementPayment.amount_eur} ✓` : '待结算'}
                          </p>
                        ) : (
                          <p className="text-[10px] text-gray-300">待申报</p>
                        )}
                        {invs.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{invs.length}张发票</p>
                        )}
                      </td>

                      {/* 转账凭证 */}
                      <td className="py-3 pl-3 min-w-[80px]">
                        {proofUploads.length > 0 ? (
                          <div className="space-y-1">
                            {proofUploads.slice(0, 2).map((u, i) => (
                              <a key={u.id || i} href={`/api/uploads/${u.id}/download`}
                                className="text-[10px] text-primary hover:underline block truncate max-w-[120px]"
                                download
                                title={u.original_name}
                              >
                                📄 {u.original_name?.slice(0, 16)}...
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                        <label className="cursor-pointer text-[10px] text-gray-400 hover:text-primary transition-colors mt-1 inline-block">
                          {uploadingCid === c.id ? '上传中...' : '📤 上传'}
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUpload(e, c.id)} disabled={uploadingCid === c.id} className="hidden" />
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
