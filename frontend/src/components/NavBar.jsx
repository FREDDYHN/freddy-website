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

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl font-bold text-primary">FREDDY</span>
          <span className="hidden sm:inline text-sm text-gray-500">福瑞笛 德国跨境合规</span>
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
          <Link
            to="/signup"
            className="ml-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light rounded-lg transition-colors"
          >
            在线签约
          </Link>
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
          <Link
            to="/signup"
            className="block mt-2 py-2.5 text-sm font-medium text-primary"
            onClick={() => setMenuOpen(false)}
          >
            在线签约 →
          </Link>
        </div>
      )}
    </header>
  )
}
