import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: '首页' },
  { to: '/packaging', label: '包装法' },
  { to: '/weee', label: 'WEEE' },
  { to: '/battery', label: '电池法' },
  { to: '/calculator', label: '费用计算' },
  { to: '/faq', label: '常见问题' },
]

function useAuth() {
  try { return JSON.parse(sessionStorage.getItem('user') || 'null') || null } catch { return null }
}

const navText = '#5a6d82'
const navActive = '#0a1628'
const navHoverBg = 'rgba(10,22,40,0.04)'
const borderColor = '#e2e6ed'

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const user = useAuth()
  const isLoggedIn = !!user

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <header className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${borderColor}` }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="font-extrabold text-lg tracking-tight" style={{ color: '#0a1628' }}>FREDDY</span>
          <span className="text-xs font-medium hidden sm:inline" style={{ color: '#8b9aab' }}>福瑞笛</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="px-3 py-2 text-sm rounded-md transition-colors font-medium"
              style={{
                color: isActive(l.to) ? navActive : navText,
                background: isActive(l.to) ? navHoverBg : 'transparent',
              }}
            >{l.label}</Link>
          ))}
          <div className="w-px h-5 mx-2" style={{ background: borderColor }}></div>
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="px-3 py-2 text-sm rounded-md transition-colors font-medium" style={{ color: navText }}>面板</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="px-3 py-2 text-sm rounded-md transition-colors font-medium" style={{ color: navText }}>管理</Link>
              )}
              <Link to="/login" onClick={() => { sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')) }}
                className="ml-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{ color: navText, border: `1px solid ${borderColor}` }}>退出</Link>
            </>
          ) : (
            <Link to="/login" className="ml-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-all text-white"
              style={{ background: '#1e3a5f' }}>登录</Link>
          )}
        </nav>

        <button className="md:hidden p-2" style={{ color: navText }} aria-label="菜单"
          onClick={() => setMenuOpen(o => !o)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden px-4 pb-4 bg-white" style={{ borderTop: `1px solid ${borderColor}` }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} className="block py-2.5 text-sm font-medium"
              style={{ color: isActive(l.to) ? navActive : navText }}
              onClick={() => setMenuOpen(false)}>{l.label}</Link>
          ))}
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${borderColor}` }}>
            {isLoggedIn ? (
              <>
                <Link to="/dashboard" className="block py-2.5 text-sm font-medium" style={{ color: navText }} onClick={() => setMenuOpen(false)}>我的面板</Link>
                {user?.role === 'admin' && <Link to="/admin" className="block py-2.5 text-sm font-medium" style={{ color: navText }} onClick={() => setMenuOpen(false)}>管理后台</Link>}
                <Link to="/login" onClick={() => { setMenuOpen(false); sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')) }}
                  className="block py-2.5 text-sm font-medium" style={{ color: navText }}>退出登录</Link>
              </>
            ) : (
              <Link to="/login" className="block py-2.5 text-sm font-semibold" style={{ color: '#1e3a5f' }} onClick={() => setMenuOpen(false)}>登录</Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
