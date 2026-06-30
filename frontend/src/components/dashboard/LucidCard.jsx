import { useState } from 'react'

export default function LucidCard({ contract, onToggle }) {
  const [toggling, setToggling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  if (!contract) return null

  const isConfirmed = !!contract.lucid_confirmed

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    try {
      await onToggle(contract.id, isConfirmed)
      setShowConfirm(false)
    } finally {
      setToggling(false)
    }
  }

  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="bg-white border border-gray-100 rounded-lg">
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50/50 transition-colors rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">🛡️ LUCID 授权</span>
          {isConfirmed ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ 已授权</span>
          ) : (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⚠️ 待授权</span>
          )}
        </div>
        <span className={`text-gray-300 text-xs transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>▼</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-96'}`}>
        <div className="px-5 pb-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1.5">
            <p className="font-medium text-gray-700">请在 LUCID 中将 LIVANTO GmbH 指定为授权代表：</p>
            <ol className="list-decimal list-inside space-y-0.5 ml-1 text-gray-500">
              <li>登录 <a href="https://lucid.verpackungsregister.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">lucid.verpackungsregister.org</a></li>
              <li>进入 "Authorized Representative" 设置</li>
              <li>搜索并选择 <strong>LIVANTO GmbH</strong></li>
              <li>确认授权委任</li>
              <li>完成后，点击下方按钮确认</li>
            </ol>
          </div>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className={`w-full py-2.5 rounded-md text-sm font-semibold transition-colors ${
                isConfirmed
                  ? 'border border-red-200 text-red-600 hover:bg-red-50'
                  : 'bg-primary text-white hover:bg-primary-light'
              }`}
            >
              {isConfirmed ? '🔄 修改LUCID授权状态' : '✅ 我已在LUCID中完成授权'}
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-xs text-amber-700 font-medium">
                {isConfirmed
                  ? '确认取消LUCID授权？取消后需重新在LUCID中完成授权。'
                  : '请确认您已在 LUCID 中完成 LIVANTO GmbH 的授权委任。'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
                    isConfirmed
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-primary text-white hover:bg-primary-light'
                  } disabled:opacity-50`}
                >
                  {toggling ? '处理中...' : (isConfirmed ? '确认取消' : '确认已完成')}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-md text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  返回
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
