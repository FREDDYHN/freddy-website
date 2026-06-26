import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  // Password change state
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' })

  const authHeaders = () => {
    const token = sessionStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : {}
  }

  useEffect(() => {
    fetch('/api/profile', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setProfile(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(profile) })
      if (res.ok) setMessage('✅ 信息已更新')
      else { const d = await res.json(); throw new Error(d.error) }
    } catch (e) { setMessage('❌ ' + e.message) }
    setSaving(false)
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (pw.newPw !== pw.confirm) { setPwMsg('❌ 两次密码不一致'); return }
    if (pw.newPw.length < 6) { setPwMsg('❌ 密码至少6位'); return }
    setPwMsg('')
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ current_password: pw.current, new_password: pw.newPw }),
      })
      const d = await res.json()
      if (res.ok) { setPwMsg('✅ 密码已更新'); setPw({ current: '', newPw: '', confirm: '' }) }
      else setPwMsg('❌ ' + d.error)
    } catch (e) { setPwMsg('❌ ' + e.message) }
  }

  const userStr = sessionStorage.getItem('user')
  const isAdmin = (() => { try { return JSON.parse(userStr)?.role === 'admin' } catch { return false } })()

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16"><div className="animate-pulse h-32 bg-gray-100 rounded" /></div>
  if (!userStr) return <div className="max-w-2xl mx-auto px-4 py-16 text-center"><p className="text-gray-500">请先 <Link to="/login" className="text-primary underline">登录</Link></p></div>
  if (isAdmin) return <div className="max-w-2xl mx-auto px-4 py-16 text-center"><p className="text-gray-500">管理员账户无需维护公司资料。请前往 <Link to="/admin" className="text-primary underline">管理后台</Link></p></div>
  if (!profile) return <div className="max-w-2xl mx-auto px-4 py-16 text-center"><p className="text-gray-500">未找到客户资料，请联系客服。</p></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">账户管理</h1>
      <p className="text-gray-500 text-sm mb-8">{profile.company_name}</p>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4 mb-8">
        <h2 className="font-bold text-lg">公司信息</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">公司名称</label>
            <input value={profile.company_name || ''} onChange={e => setProfile(p => ({...p, company_name: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">公司英文名</label>
            <input value={profile.company_name_en || ''} onChange={e => setProfile(p => ({...p, company_name_en: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">统一社会信用代码</label>
            <input value={profile.uscc || ''} onChange={e => setProfile(p => ({...p, uscc: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">法定代表人</label>
            <input value={profile.legal_representative || ''} onChange={e => setProfile(p => ({...p, legal_representative: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">联系人</label>
            <input value={profile.contact_name || ''} onChange={e => setProfile(p => ({...p, contact_name: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">手机号</label>
            <input value={profile.contact_phone || ''} onChange={e => setProfile(p => ({...p, contact_phone: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">注册地址</label>
            <input value={profile.registered_address || ''} onChange={e => setProfile(p => ({...p, registered_address: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">LUCID注册号</label>
            <input value={profile.lucid_registration_number || ''} onChange={e => setProfile(p => ({...p, lucid_registration_number: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" placeholder="DE..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">微信</label>
            <input value={profile.wechat_id || ''} onChange={e => setProfile(p => ({...p, wechat_id: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
        </div>
        {message && <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}
        <button type="submit" disabled={saving}
          className="px-6 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50">
          {saving ? '保存中...' : '保存修改'}
        </button>
      </form>

      {/* Password Change */}
      <form onSubmit={handlePassword} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-bold text-lg">修改密码</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">当前密码</label>
            <input type="password" value={pw.current} onChange={e => setPw(p => ({...p, current: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">新密码</label>
            <input type="password" value={pw.newPw} onChange={e => setPw(p => ({...p, newPw: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">确认新密码</label>
            <input type="password" value={pw.confirm} onChange={e => setPw(p => ({...p, confirm: e.target.value}))}
              className="w-full border rounded-lg p-2.5 text-sm" />
          </div>
        </div>
        {pwMsg && <p className={`text-sm ${pwMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>}
        <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-medium">
          修改密码
        </button>
      </form>
    </div>
  )
}
