import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { EMAIL_RE } from '@shared/constants.js'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (token) nav('/dashboard', { replace: true })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !EMAIL_RE.test(email)) return setError('请输入有效邮箱')
    if (!password) return setError('请输入密码')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登录失败')
      sessionStorage.setItem('token', data.token)
      sessionStorage.setItem('user', JSON.stringify(data.user))
      nav(data.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-extrabold text-center mb-8">登录</h1>
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-lg p-6 space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50">{loading ? '登录中...' : '登录'}</button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">还没有账号？<Link to="/signup" className="text-primary font-medium">在线签约</Link> 自动创建</p>
      </div>
    </div>
  )
}
