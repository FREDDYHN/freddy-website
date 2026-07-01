import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const inputCls = 'w-full border border-gray-400 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary'

export default function SetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password || password.length < 6) {
      setError('密码至少需要6位字符')
      return
    }
    if (password !== confirm) {
      setError('两次密码输入不一致')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '验证失败')

      // Store token and redirect to dashboard
      sessionStorage.setItem('token', data.token)
      sessionStorage.setItem('user', JSON.stringify(data.user))
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-20" style={{ background: '#f4f2ef' }}>
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white border border-gray-100 rounded-lg p-8 space-y-5">
          <div className="text-center">
            <h1 className="text-xl font-extrabold mb-1">设置登录密码</h1>
            <p className="text-sm text-gray-400">FREDDY 福瑞笛 — 邮箱验证完成</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
              {error}
              {error.includes('过期') && (
                <button onClick={() => navigate('/signup')} className="block mt-2 text-primary hover:underline text-xs">重新提交申请 →</button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">登录密码 *</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputCls} pr-10`}
                  placeholder="至少6位字符"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                  {showPw ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">确认密码 *</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={inputCls}
                placeholder="请再次输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !password || !confirm}
              className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {submitting ? '验证中...' : '设置密码并登录 →'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center pt-2">
            设置密码即表示您同意 FREDDY 的
            <a href="/terms" className="text-primary hover:underline">服务条款</a>
            {' '}和{' '}
            <a href="/privacy" className="text-primary hover:underline">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  )
}
