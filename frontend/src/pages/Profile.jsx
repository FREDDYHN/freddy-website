import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const inpCls = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary'
const btnCls = 'px-5 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50'

export default function Profile() {
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pw, setPw] = useState({ c: '', n: '', x: '' })
  const [pwMsg, setPwMsg] = useState('')

  const ah = () => { const t = sessionStorage.getItem('token'); return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : {} }

  useEffect(() => { fetch('/api/profile', { headers: ah() }).then(r => r.json()).then(d => { if (d.success) setP(d.data) }).catch(() => {}).finally(() => setLoading(false)) }, [])

  const save = async (e) => { e.preventDefault(); setSaving(true); setMsg(''); try { const r = await fetch('/api/profile', { method: 'PUT', headers: ah(), body: JSON.stringify(p) }); if (r.ok) setMsg('✅ 已更新'); else { const d = await r.json(); throw new Error(d.error) } } catch (e) { setMsg('❌ ' + e.message) }; setSaving(false) }
  const chPw = async (e) => { e.preventDefault(); if (pw.n !== pw.x) { setPwMsg('❌ 两次密码不一致'); return }; if (pw.n.length < 6) { setPwMsg('❌ 密码至少6位'); return }; setPwMsg(''); try { const r = await fetch('/api/profile/password', { method: 'PUT', headers: ah(), body: JSON.stringify({ current_password: pw.c, new_password: pw.n }) }); const d = await r.json(); if (r.ok) { setPwMsg('✅ 密码已更新'); setPw({ c: '', n: '', x: '' }) } else setPwMsg('❌ ' + d.error) } catch (e) { setPwMsg('❌ ' + e.message) } }

  const user = (() => { try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null } })()
  const isAdmin = user?.role === 'admin'

  if (loading) return <div className="max-w-xl mx-auto px-4 py-16"><div className="animate-pulse h-32 bg-gray-100 rounded" /></div>
  if (!user) return <div className="max-w-xl mx-auto px-4 py-16 text-center"><p className="text-gray-400">请先 <Link to="/login" className="text-primary underline font-medium">登录</Link></p></div>
  if (isAdmin) return <div className="max-w-xl mx-auto px-4 py-16 text-center"><p className="text-gray-400">管理员账户 <Link to="/admin" className="text-primary underline font-medium">前往后台</Link></p></div>
  if (!p) return <div className="max-w-xl mx-auto px-4 py-16 text-center"><p className="text-gray-400">未找到客户资料</p></div>

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold mb-1">账户管理</h1>
      <p className="text-sm text-gray-400 mb-8">{p.company_name}</p>

      <form onSubmit={save} className="bg-white border border-gray-100 rounded-lg p-5 space-y-4 mb-6">
        <h2 className="font-bold">公司信息</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-gray-400 mb-1">公司名称</label><input value={p.company_name || ''} onChange={e => setP(pr => ({ ...pr, company_name: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">英文名</label><input value={p.company_name_en || ''} onChange={e => setP(pr => ({ ...pr, company_name_en: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">信用代码</label><input value={p.uscc || ''} onChange={e => setP(pr => ({ ...pr, uscc: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">法定代表人</label><input value={p.legal_representative || ''} onChange={e => setP(pr => ({ ...pr, legal_representative: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">联系人</label><input value={p.contact_name || ''} onChange={e => setP(pr => ({ ...pr, contact_name: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">手机号</label><input value={p.contact_phone || ''} onChange={e => setP(pr => ({ ...pr, contact_phone: e.target.value }))} className={inpCls} /></div>
          <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-400 mb-1">注册地址</label><input value={p.registered_address || ''} onChange={e => setP(pr => ({ ...pr, registered_address: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">LUCID 注册号</label><input value={p.lucid_registration_number || ''} onChange={e => setP(pr => ({ ...pr, lucid_registration_number: e.target.value }))} className={inpCls} placeholder="DE..." /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">微信</label><input value={p.wechat_id || ''} onChange={e => setP(pr => ({ ...pr, wechat_id: e.target.value }))} className={inpCls} /></div>
        </div>
        {msg && <p className={`text-xs ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
        <button type="submit" disabled={saving} className={btnCls}>{saving ? '保存中...' : '保存修改'}</button>
      </form>

      <form onSubmit={chPw} className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
        <h2 className="font-bold">修改密码</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="block text-xs font-medium text-gray-400 mb-1">当前密码</label><input type="password" value={pw.c} onChange={e => setPw(pr => ({ ...pr, c: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">新密码</label><input type="password" value={pw.n} onChange={e => setPw(pr => ({ ...pr, n: e.target.value }))} className={inpCls} /></div>
          <div><label className="block text-xs font-medium text-gray-400 mb-1">确认新密码</label><input type="password" value={pw.x} onChange={e => setPw(pr => ({ ...pr, x: e.target.value }))} className={inpCls} /></div>
        </div>
        {pwMsg && <p className={`text-xs ${pwMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>}
        <button type="submit" className={btnCls}>修改密码</button>
      </form>
    </div>
  )
}
