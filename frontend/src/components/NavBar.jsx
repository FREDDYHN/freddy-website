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
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const user = useAuth()

  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 h-14">
      <div className="max-w-5xl mx-auto px-5 h-full flex items-center justify-between">
        <Link to="/" className="no-underline flex items-baseline gap-1.5">
          <span className="text-lg font-extrabold tracking-tight text-primary">FREDDY</span>
          <span className="text-xs font-medium text-gray-400">福瑞笛</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                isActive(l.to) ? 'text-primary bg-primary/5' : 'text-gray-500 hover:text-primary hover:bg-gray-50'
              }`}>{l.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard" className="hidden md:block text-[13px] font-medium text-gray-500 hover:text-primary px-2">面板</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="hidden md:block text-[13px] font-medium text-gray-500 hover:text-primary px-2">管理</Link>
              )}
              <Link to="/login" onClick={() => { sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')) }}
                className="text-[13px] font-medium text-gray-400 px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50">退出</Link>
            </>
          ) : (
            <Link to="/login" className="text-[13px] font-semibold text-white bg-primary px-4 py-1.5 rounded-md hover:bg-primary-light transition-colors">登录</Link>
          )}
          <button className="md:hidden p-1 text-gray-500" onClick={() => setMenuOpen(o => !o)} aria-label="菜单">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 pb-4 pt-2">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`block py-2.5 text-sm font-medium ${isActive(l.to) ? 'text-primary' : 'text-gray-500'}`}
              onClick={() => setMenuOpen(false)}>{l.label}</Link>
          ))}
          {user && <Link to="/dashboard" className="block py-2.5 text-sm font-medium text-gray-500" onClick={() => setMenuOpen(false)}>面板</Link>}
          {user?.role === 'admin' && <Link to="/admin" className="block py-2.5 text-sm font-medium text-gray-500" onClick={() => setMenuOpen(false)}>管理</Link>}
        </div>
      )}
    </header>
  )
}
