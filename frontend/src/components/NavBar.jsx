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
  try {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null')
    return user || null
  } catch { return null }
}

const navBg = '#1c2a3a'
const borderColor = '#2a3b50'
const textColor = '#8899aa'
const textActive = '#00b4d8'
const textHover = '#e8edf2'

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const user = useAuth()
  const isLoggedIn = !!user

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const linkClass = (path) =>
    `px-3 py-2 text-sm rounded-md transition-colors ${
      isActive(path) ? 'font-medium' : ''
    }`

  return (
    <header className="sticky top-0 z-50" style={{ background: navBg, borderBottom: `1px solid ${borderColor}` }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center no-underline">
          <img src="/freddy-logo.png" alt="FREDDY 福瑞笛" className="h-8 w-auto" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={linkClass(l.to)}
              style={{
                color: isActive(l.to) ? textActive : textColor,
                background: isActive(l.to) ? 'rgba(0,180,216,0.1)' : 'transparent',
              }}
              onMouseEnter={e => { if (!isActive(l.to)) { e.target.style.color = textHover; e.target.style.background = 'rgba(0,180,216,0.06)' } }}
              onMouseLeave={e => { e.target.style.color = isActive(l.to) ? textActive : textColor; e.target.style.background = isActive(l.to) ? 'rgba(0,180,216,0.1)' : 'transparent' }}
            >
              {l.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="px-3 py-2 text-sm rounded-md transition-colors"
                style={{ color: textColor }}
                onMouseEnter={e => { e.target.style.color = textHover }}
                onMouseLeave={e => { e.target.style.color = textColor }}>
                📋 面板
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="px-3 py-2 text-sm rounded-md transition-colors"
                  style={{ color: textColor }}
                  onMouseEnter={e => { e.target.style.color = textHover }}
                  onMouseLeave={e => { e.target.style.color = textColor }}>
                  ⚙️ 管理
                </Link>
              )}
              <Link to="/login" onClick={() => { sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')) }}
                className="ml-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ color: textColor, border: `1px solid ${borderColor}` }}>
                退出
              </Link>
            </>
          ) : (
            <Link to="/login" className="px-4 py-2 text-sm font-semibold rounded-lg transition-all"
              style={{ background: textActive, color: '#fff' }}>
              登录
            </Link>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2"
          style={{ color: textColor }}
          aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4" style={{ background: navBg, borderTop: `1px solid ${borderColor}` }}>
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="block py-2.5 text-sm"
              style={{ color: isActive(l.to) ? textActive : textColor }}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${borderColor}` }}>
            {isLoggedIn ? (
              <>
                <Link to="/dashboard" className="block py-2.5 text-sm" style={{ color: textColor }} onClick={() => setMenuOpen(false)}>📋 我的面板</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="block py-2.5 text-sm" style={{ color: textColor }} onClick={() => setMenuOpen(false)}>⚙️ 管理后台</Link>
                )}
                <Link to="/login" onClick={() => { setMenuOpen(false); sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')) }}
                  className="block py-2.5 text-sm" style={{ color: textColor }}>退出登录</Link>
              </>
            ) : (
              <Link to="/login" className="block py-2.5 text-sm" style={{ color: textActive }} onClick={() => setMenuOpen(false)}>登录</Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
