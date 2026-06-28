const STEPS = [
  { key: 'signed', label: '签约', icon: '✍️' },
  { key: 'paid', label: '付款确认', icon: '💰' },
  { key: 'lucid', label: 'LUCID授权', icon: '🛡️' },
  { key: 'reporting', label: '申报中', icon: '📊' },
  { key: 'complete', label: '年度完成', icon: '✅' },
]

function stepStatus(contract, packaging, idx) {
  // Step 0: signed
  if (idx === 0) return contract.signed_at ? 'done' : contract.status === 'pending_payment' ? 'current' : 'pending'
  // Step 1: paid confirmed
  if (idx === 1) {
    if (contract.paid_confirmed_at) return 'done'
    if (contract.signed_at) return 'current'
    return 'pending'
  }
  // Step 2: LUCID
  if (idx === 2) {
    if (contract.lucid_confirmed) return 'done'
    if (contract.paid_confirmed_at) return 'current'
    return 'pending'
  }
  // Step 3: reporting
  if (idx === 3) {
    // If packaging has submitted data for current year, consider reporting done
    const hasReporting = packaging && packaging.length > 0 && packaging.some(p => p.submitted_at)
    if (hasReporting) return 'done'
    if (contract.lucid_confirmed) return 'current'
    return 'pending'
  }
  // Step 4: complete
  if (idx === 4) {
    // Complete when all previous steps done
    const allDone = [0, 1, 2, 3].every(i => stepStatus(contract, packaging, i) === 'done')
    return allDone ? 'current' : 'pending'
  }
  return 'pending'
}

function dateLabel(contract, packaging, idx) {
  switch (idx) {
    case 0: return contract.signed_at ? contract.signed_at.slice(0, 10) : '待签署'
    case 1: return contract.paid_confirmed_at ? contract.paid_confirmed_at.slice(0, 10) : '待确认'
    case 2: return contract.lucid_confirmed ? '已授权' : '待授权'
    case 3: {
      const hasReporting = packaging && packaging.length > 0 && packaging.some(p => p.submitted_at)
      return hasReporting ? '已提交' : '待提交'
    }
    case 4: return '—'
    default: return ''
  }
}

export default function ContractProgress({ contract, packaging }) {
  if (!contract) return null

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5">
      <h3 className="font-semibold text-sm text-gray-700 mb-4">合同生命周期</h3>
      <div className="flex items-start justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-[12%] right-[12%] h-0.5 bg-gray-200" style={{ zIndex: 0 }} />
        {STEPS.map((step, i) => {
          const status = stepStatus(contract, packaging, i)
          const dateStr = dateLabel(contract, packaging, i)
          return (
            <div key={step.key} className="flex flex-col items-center relative z-10 flex-1" style={{ minWidth: 0 }}>
              {/* Circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mb-1.5 transition-colors ${
                status === 'done' ? 'bg-green-500 text-white' :
                status === 'current' ? 'bg-primary text-white animate-pulse' :
                'bg-gray-100 text-gray-300'
              }`}>
                {status === 'done' ? '✓' : step.icon}
              </div>
              {/* Label */}
              <span className={`text-xs font-medium truncate max-w-full ${
                status === 'done' ? 'text-green-600' :
                status === 'current' ? 'text-primary' :
                'text-gray-300'
              }`}>{step.label}</span>
              {/* Date */}
              <span className={`text-[10px] mt-0.5 truncate max-w-full ${
                status === 'done' ? 'text-gray-400' :
                status === 'current' ? 'text-primary/70' :
                'text-gray-300'
              }`}>{dateStr}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
