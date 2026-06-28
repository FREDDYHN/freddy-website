import { REPORTING_DEADLINE_MONTH, REPORTING_DEADLINE_DAY } from '@shared/constants.js'

function daysToDeadline() {
  const now = new Date()
  const year = now.getMonth() + 1 > REPORTING_DEADLINE_MONTH || (now.getMonth() + 1 === REPORTING_DEADLINE_MONTH && now.getDate() > REPORTING_DEADLINE_DAY)
    ? now.getFullYear() + 1 : now.getFullYear()
  const target = new Date(year, REPORTING_DEADLINE_MONTH - 1, REPORTING_DEADLINE_DAY)
  return Math.max(0, Math.ceil((target - now) / 86400000))
}

function calcDaysLeft(contract) {
  const now = new Date()
  const activationDate = contract.paid_confirmed_at ? new Date(contract.paid_confirmed_at) : new Date(contract.start_date)
  const effectiveEnd = new Date(activationDate)
  effectiveEnd.setFullYear(effectiveEnd.getFullYear() + 1)
  return Math.max(0, Math.ceil((effectiveEnd - now) / 86400000))
}

export default function UrgentAlertBanner({ reminders, contract }) {
  if (!contract) return null

  const stored = sessionStorage.getItem(`dismissed_banner_${contract.id}`)
  if (stored === new Date().toISOString().slice(0, 10)) return null

  const dismiss = () => sessionStorage.setItem(`dismissed_banner_${contract.id}`, new Date().toISOString().slice(0, 10))

  const now = new Date()
  const pendingReminders = (reminders || []).filter(r => {
    if (r.status !== 'pending') return false
    if (!r.due_date) return false
    return new Date(r.due_date) >= now
  })
  const hasOverdueReminder = (reminders || []).some(r => r.status === 'pending' && r.due_date && new Date(r.due_date) < now)

  // Priority: overdue payment > imminent deadline > LUCID not confirmed > payment pending
  let alert = null

  // Check overdue
  if (hasOverdueReminder) {
    alert = { level: 'critical', icon: '🚨', title: '有逾期提醒', desc: '您有待处理的过期提醒，请尽快处理以免影响合规状态。', color: 'bg-red-50 border-red-200 text-red-700' }
  } else if (contract.status === 'pending_payment') {
    alert = { level: 'critical', icon: '💰', title: '年费待支付', desc: `请尽快完成转账支付以激活合同（€${contract.annual_fee_eur}）。`, color: 'bg-amber-50 border-amber-200 text-amber-700' }
  } else if (!contract.lucid_confirmed && contract.status === 'active') {
    const d2d = daysToDeadline()
    if (d2d <= 14) {
      alert = { level: 'warning', icon: '⚠️', title: `距申报截止仅${d2d}天`, desc: '请尽快在LUCID中将LIVANTO GmbH指定为授权代表。', color: 'bg-amber-50 border-amber-200 text-amber-700' }
    } else {
      alert = { level: 'notice', icon: '🛡️', title: '请完成LUCID授权', desc: '请在LUCID中将LIVANTO GmbH指定为您的授权代表。', color: 'bg-blue-50 border-blue-200 text-blue-700' }
    }
  } else if (contract.status === 'active') {
    const d2d = daysToDeadline()
    if (d2d <= 5) {
      alert = { level: 'critical', icon: '🚨', title: `申报截止仅剩${d2d}天！`, desc: '请立即准备并提交年度包装申报数据。', color: 'bg-red-50 border-red-200 text-red-700' }
    } else if (d2d <= 14) {
      alert = { level: 'warning', icon: '⚠️', title: `申报截止还有${d2d}天`, desc: '请开始准备年度包装申报数据。', color: 'bg-amber-50 border-amber-200 text-amber-700' }
    } else {
      const dl = calcDaysLeft(contract)
      if (dl <= 30) {
        alert = { level: 'notice', icon: '📅', title: `合同还有${dl}天到期`, desc: '请留意合同续约事宜。', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' }
      }
    }
  }

  if (!alert) {
    // Show pending reminders count if any
    if (pendingReminders.length > 0) {
      alert = { level: 'notice', icon: '📌', title: `${pendingReminders.length}项待办提醒`, desc: '查看下方详情确保合规。', color: 'bg-blue-50 border-blue-200 text-blue-700' }
    }
  }

  if (!alert) return null

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${alert.color} animate-in fade-in slide-in-from-top-2 duration-300`}>
      <span className="text-xl flex-shrink-0 mt-0.5">{alert.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{alert.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{alert.desc}</p>
      </div>
      <button onClick={dismiss} className="text-xs opacity-50 hover:opacity-100 flex-shrink-0 px-2 py-1 rounded hover:bg-black/5 transition-colors">✕</button>
    </div>
  )
}
