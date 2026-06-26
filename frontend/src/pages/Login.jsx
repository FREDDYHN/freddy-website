import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { EMAIL_RE } from '@shared/constants.js'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('请输入邮箱和密码')
      return
    }
    if (!EMAIL_RE.test(email)) {
      setError('邮箱格式不正确')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登录失败')

      sessionStorage.setItem('token', data.token)
      sessionStorage.setItem('user', JSON.stringify(data.user))
      nav(data.user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-center mb-8">登录</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg p-2.5 text-sm" placeholder="your@email.com" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border rounded-lg p-2.5 text-sm" placeholder="••••••" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-50">
          {loading ? '登录中...' : '登录'}
        </button>
        <p className="text-center text-sm text-gray-500">
          还没有账号？<Link to="/signup" className="text-primary underline">在线签约</Link> 自动创建
        </p>
      </form>
    </div>
  )
}
