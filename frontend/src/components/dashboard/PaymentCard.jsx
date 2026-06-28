import { useState } from 'react'

export default function PaymentCard({ contract, payments, bankInfo, onNotifyPaid, recyclingFees }) {
  const [showBank, setShowBank] = useState(contract && contract.status === 'pending_payment')
  const [notifying, setNotifying] = useState(false)

  const handleNotify = async () => {
    if (!contract || notifying) return
    setNotifying(true)
    try { await onNotifyPaid(contract.id) } finally { setNotifying(false) }
  }

  const paidPayments = (payments || []).filter(p => p.status === 'paid')
  const pendingPayments = (payments || []).filter(p => p.status === 'pending')
  const recyclingList = (recyclingFees || []).length > 0 ? recyclingFees : []

  const bank = bankInfo || {}
  const isPending = contract && contract.status === 'pending_payment'

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">💰 付费管理</h3>
        {isPending ? (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">待付款</span>
        ) : (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">已付清</span>
        )}
      </div>

      {/* Annual Fee */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400">授权代表年费</span>
            <p className="text-lg font-bold text-primary">€{contract ? contract.annual_fee_eur : '—'}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400">状态</span>
            <p className={`text-sm font-medium ${isPending ? 'text-yellow-600' : 'text-green-600'}`}>
              {isPending ? '待付款' : '已付款'}
            </p>
          </div>
        </div>
        {contract && contract.paid_confirmed_at && (
          <p className="text-xs text-gray-400 mt-1">确认日期：{contract.paid_confirmed_at.slice(0, 10)}</p>
        )}
      </div>

      {/* Bank transfer info - expandable */}
      {isPending && (
        <div>
          <button
            onClick={() => setShowBank(!showBank)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors w-full"
          >
            <span>{showBank ? '▲' : '▼'}</span> 银行转账付款信息
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${showBank ? 'max-h-80 mt-2' : 'max-h-0'}`}>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs space-y-1">
              {bank.bank_name && <div className="flex justify-between"><span className="text-gray-400">银行</span><span className="font-medium">{bank.bank_name}</span></div>}
              {bank.account_name && <div className="flex justify-between"><span className="text-gray-400">户名</span><span className="font-medium text-[11px]">{bank.account_name}</span></div>}
              {bank.account_number && <div className="flex justify-between"><span className="text-gray-400">账号</span><span className="font-medium font-mono">{bank.account_number}</span></div>}
              {bank.swift && <div className="flex justify-between"><span className="text-gray-400">SWIFT</span><span className="font-medium font-mono">{bank.swift}</span></div>}
              {bank.reference_prefix && <div className="flex justify-between"><span className="text-gray-400">附言</span><span className="font-medium">{bank.reference_prefix}{contract?.contract_number || ''}</span></div>}
              {bank.note && <p className="text-gray-500 mt-1 pt-1 border-t border-blue-200">{bank.note}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      {isPending && (
        <button
          onClick={handleNotify}
          disabled={notifying}
          className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
        >
          {notifying ? '提交中...' : '✅ 我已完成银行转账'}
        </button>
      )}

      {/* Recycling fee info */}
      {recyclingList.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-gray-500 mb-2">回收费</h4>
          {recyclingList.map((rf, i) => (
            <div key={rf.id || i} className="flex justify-between text-xs py-1">
              <span className="text-gray-400">{rf.payment_type === 'recycling_prepaid' ? '预缴' : '结算'}</span>
              <span className={`font-medium ${rf.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                €{rf.amount_eur || '—'} · {rf.status === 'paid' ? '已付' : '待付'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Payment history (mini) */}
      {paidPayments.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-gray-500 mb-2">付款记录（最近3条）</h4>
          {paidPayments.slice(0, 3).map((p) => (
            <div key={p.id} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-500">{p.out_trade_no?.slice(0, 16)}...</span>
              <span className="font-medium tabular-nums">€{p.amount_eur}</span>
              <span className="text-gray-400">{p.paid_at?.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
