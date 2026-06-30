import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const inpCls = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary'
const btnCls = 'px-5 py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50'

export default function Profile() {
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [pw, setPw] = useState({ c: '', n: '', x: '' })
  const [pwMsg, setPwMsg] = useState('')

  const ah = () => { const t = sessionStorage.getItem('token'); return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : {} }

  useEffect(() => { fetch('/api/profile', { headers: ah() }).then(r => r.json()).then(d => { if (d.success) setP(d.data) }).catch(() => {}).finally(() => setLoading(false)) }, [])

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

      <div className="bg-white border border-gray-100 rounded-lg p-5 space-y-4 mb-6">
        <h2 className="font-bold">公司信息</h2>
        <p className="text-xs text-gray-400">信息已写入合同，如需修改请联系管理员。</p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ['公司名称', p.company_name],
            ['英文名', p.company_name_en],
            ['信用代码', p.uscc],
            ['法定代表人', p.legal_representative],
            ['联系人', p.contact_name],
            ['手机号', p.contact_phone],
            ['注册地址', p.registered_address],
            ['LUCID 注册号', p.lucid_registration_number],
            ['微信', p.wechat_id],
          ].map(([label, val]) => val ? (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
              <p className="text-sm text-gray-700 py-1.5">{val}</p>
            </div>
          ) : null)}
        </div>
        <button onClick={async () => {
          try {
            const r = await fetch('/api/admin/messages', {
              method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' },
              body: JSON.stringify({ client_id: p.id, title: '📝 信息修改申请', message: `客户 ${p.company_name} 申请修改公司信息，请管理员处理。` }),
            })
            if (r.ok) setMsg('✅ 已通知管理员，请等待审核')
            else setMsg('❌ 申请失败，请联系客服')
          } catch { setMsg('❌ 网络错误') }
        }} className="px-4 py-2 border border-primary text-primary rounded-md text-sm font-medium hover:bg-primary/5">
          📝 申请修改信息
        </button>
        {msg && <p className={`text-xs ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
      </div>

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
