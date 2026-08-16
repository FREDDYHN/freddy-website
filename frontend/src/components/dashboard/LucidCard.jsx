import { useState } from 'react'

export default function LucidCard({ contract, client, onToggle }) {
  const [toggling, setToggling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [collapsed, setCollapsed] = useState(true)

  // LUCID 账号信息表单状态
  const [lucidLogin, setLucidLogin] = useState(client?.lucid_login || '')
  const [lucidPassword, setLucidPassword] = useState('')
  const [lucidConfirm, setLucidConfirm] = useState('')
  const [savingLucid, setSavingLucid] = useState(false)
  const [lucidMsg, setLucidMsg] = useState('')

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

  const handleSaveLucid = async () => {
    if (!lucidLogin.trim()) { setLucidMsg('请填写 LUCID 登录名'); return }
    if (!lucidPassword) { setLucidMsg('请填写 LUCID 密码'); return }
    if (lucidPassword !== lucidConfirm) { setLucidMsg('两次输入的密码不一致'); return }
    setSavingLucid(true)
    setLucidMsg('')
    try {
      const t = sessionStorage.getItem('token')
      const r = await fetch('/api/profile/lucid', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({ lucid_login: lucidLogin.trim(), lucid_password: lucidPassword }),
      })
      const d = await r.json()
      if (r.ok) {
        setLucidMsg('✅ LUCID 账号已保存')
        setLucidPassword('')
        setLucidConfirm('')
      } else {
        setLucidMsg(d.error || '保存失败')
      }
    } catch {
      setLucidMsg('网络错误，请稍后重试')
    } finally {
      setSavingLucid(false)
    }
  }

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
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-[800px]'}`}>
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

          {/* LUCID 账号信息 */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">🔐 LUCID 账号信息</span>
              {client?.lucid_login && <span className="text-xs text-gray-400">已保存：{client.lucid_login}</span>}
            </div>
            <p className="text-xs text-gray-500">授权代表将来需要您的 LUCID 登录账号和密码，代您申报包装种类和数量。密码加密存储，仅管理员可查看。</p>
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs text-gray-500 mb-1">LUCID 登录邮箱</label>
                <input value={lucidLogin} onChange={e => setLucidLogin(e.target.value)} placeholder="请输入 LUCID 登录邮箱"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">LUCID 密码</label>
                <input type="password" value={lucidPassword} onChange={e => setLucidPassword(e.target.value)} placeholder="请输入 LUCID 密码"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">确认密码</label>
                <input type="password" value={lucidConfirm} onChange={e => setLucidConfirm(e.target.value)} placeholder="请再次输入 LUCID 密码"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              {lucidMsg && <p className={`text-xs ${lucidMsg.startsWith('✅') ? 'text-green-600' : 'text-amber-600'}`}>{lucidMsg}</p>}
              <button onClick={handleSaveLucid} disabled={savingLucid}
                className="w-full py-2.5 rounded-md text-sm font-semibold bg-primary text-white hover:bg-primary-light disabled:opacity-50 transition-colors">
                {savingLucid ? '保存中...' : (client?.lucid_login ? '💾 更新 LUCID 账号' : '💾 保存 LUCID 账号')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
