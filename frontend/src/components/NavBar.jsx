import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/packaging', label: '包装法 AR' },
  { to: '/weee', label: 'WEEE' },
  { to: '/battery', label: '电池法' },
  { to: '/calculator', label: '费用计算器' },
  { to: '/faq', label: '常见问题' },
  { to: '/downloads', label: '下载中心' },
]

function useAuth() {
  try { return JSON.parse(sessionStorage.getItem('user') || 'null') || null } catch { return null }
}

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const user = useAuth()

  const active = (p) => pathname === p || (p !== '/' && pathname.startsWith(p))

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 h-14">
      <div className="max-w-6xl mx-auto px-5 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <img src="/freddy-logo.png" alt="FREDDY 福瑞笛" className="h-7 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
              active(l.to) ? 'text-primary bg-primary/5' : 'text-gray-500 hover:text-primary hover:bg-gray-50'
            }`}>{l.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard" className="hidden md:block text-[13px] text-gray-500 hover:text-primary px-2">面板</Link>
              {user.role === 'admin' && <Link to="/admin" className="hidden md:block text-[13px] text-gray-500 hover:text-primary px-2">管理</Link>}
              <button onClick={() => { sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')) }}
                className="text-[13px] text-gray-400 px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50">退出</button>
            </>
          ) : (
            <Link to="/login" className="text-[13px] font-semibold text-white bg-primary px-4 py-1.5 rounded-md hover:bg-primary-light">登录</Link>
          )}
          <button className="md:hidden p-1 text-gray-500" onClick={() => setOpen(!open)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 pb-4 pt-2">
          {links.map(l => <Link key={l.to} to={l.to} className={`block py-2.5 text-sm font-medium ${active(l.to) ? 'text-primary' : 'text-gray-500'}`} onClick={() => setOpen(false)}>{l.label}</Link>)}
        </div>
      )}
    </header>
  )
}
