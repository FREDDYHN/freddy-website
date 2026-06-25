import { Link } from 'react-router-dom'

export default function NavBar() {
  const links = [
    { to: '/', label: '首页' },
    { to: '/packaging', label: '包装法' },
    { to: '/weee', label: 'WEEE' },
    { to: '/battery', label: '电池法' },
    { to: '/calculator', label: '费用计算' },
    { to: '/faq', label: '常见问题' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl font-bold text-primary">FREDDY</span>
          <span className="hidden sm:inline text-sm text-gray-500">福瑞笛 德国跨境合规</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.to} to={l.to}
               className="px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded-md transition-colors">
              {l.label}
            </Link>
          ))}
          <Link to="/signup" className="ml-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-light rounded-lg transition-colors">
            在线签约
          </Link>
        </nav>
        <button className="md:hidden p-2 text-gray-600" aria-label="菜单"
                onClick={() => document.getElementById('mobileNav')?.classList.toggle('hidden')}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <div id="mobileNav" className="hidden md:hidden border-t border-gray-100 bg-white px-4 pb-4">
        {links.map(l => (
          <Link key={l.to} to={l.to} className="block py-2 text-sm text-gray-600">{l.label}</Link>
        ))}
        <Link to="/signup" className="block mt-2 py-2 text-sm font-medium text-primary">在线签约 →</Link>
      </div>
    </header>
  )
}
