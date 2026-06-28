export default function StatCard({ label, value, unit, sub, urgency = 'neutral', copyable }) {
  const bc = {
    critical: 'border-l-red-500',
    warning: 'border-l-amber-500',
    notice: 'border-l-yellow-500',
    neutral: 'border-l-gray-200',
    safe: 'border-l-green-500',
  }
  const tc = {
    critical: 'text-red-600',
    warning: 'text-amber-600',
    notice: 'text-yellow-600',
    neutral: 'text-primary',
    safe: 'text-green-600',
  }
  const handleCopy = () => {
    if (copyable) { navigator.clipboard.writeText(String(value)).then(() => { const el = document.getElementById('copy-toast'); if (el) { el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 1500) } }) }
  }
  return (
    <div className={`bg-white rounded-lg p-4 border-l-4 ${bc[urgency] || bc.neutral} flex flex-col justify-between`}>
      <span className="text-xs text-gray-400 mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${tc[urgency] || tc.neutral}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {sub && <span className="text-xs text-gray-400 mt-1">{sub}</span>}
      {copyable && (
        <button onClick={handleCopy} className="mt-1 text-xs text-gray-400 hover:text-primary transition-colors self-start flex items-center gap-0.5" title="复制合同编号">
          📋 复制
        </button>
      )}
      <span id="copy-toast" className="hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50">已复制到剪贴板</span>
    </div>
  )
}
