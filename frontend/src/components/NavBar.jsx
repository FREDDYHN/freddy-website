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

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const user = useAuth()
  const isLoggedIn = !!user

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <img src="/freddy-logo.png" alt="FREDDY 福瑞笛" className="h-10 w-auto" />
          <span className="hidden sm:inline text-sm text-gray-500">德国跨境合规</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                isActive(l.to)
                  ? 'text-primary font-medium bg-primary/5'
                  : 'text-gray-600 hover:text-primary hover:bg-gray-50'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded-md">📋 面板</Link>
              <Link to="/profile" className="px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded-md">👤 账户</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded-md">⚙️ 管理</Link>
              )}
              <Link to="/login" onClick={() => { sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')) }}
                className="ml-2 px-4 py-2 text-sm font-medium text-gray-500 border rounded-lg hover:bg-gray-50 transition-colors">
                退出
              </Link>
            </>
          ) : (
            <Link to="/login" className="px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded-md">
              登录
            </Link>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 text-gray-600"
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
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`block py-2.5 text-sm ${
                isActive(l.to) ? 'text-primary font-medium' : 'text-gray-600'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2">
            {isLoggedIn ? (
              <>
                <Link to="/dashboard" className="block py-2.5 text-sm text-gray-600" onClick={() => setMenuOpen(false)}>📋 我的面板</Link>
                <Link to="/profile" className="block py-2.5 text-sm text-gray-600" onClick={() => setMenuOpen(false)}>👤 账户管理</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="block py-2.5 text-sm text-gray-600" onClick={() => setMenuOpen(false)}>⚙️ 管理后台</Link>
                )}
                <Link to="/login" onClick={() => { setMenuOpen(false); sessionStorage.clear(); window.dispatchEvent(new Event('auth:expired')) }}
                  className="block py-2.5 text-sm text-gray-500">退出登录</Link>
              </>
            ) : (
              <Link to="/login" className="block py-2.5 text-sm text-gray-600" onClick={() => setMenuOpen(false)}>登录</Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
