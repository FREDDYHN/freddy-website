import { Link } from 'react-router-dom'

const footerBg = '#0a1628'
const heading = '#fff'
const body = '#8b9aab'
const border = 'rgba(255,255,255,0.08)'

export default function Footer() {
  return (
    <footer style={{ background: footerBg }}>
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <p className="font-extrabold text-lg tracking-tight mb-3" style={{ color: heading }}>FREDDY</p>
            <p className="text-xs" style={{ color: '#c8a44e', letterSpacing: '0.05em' }}>福瑞笛</p>
            <p className="text-xs leading-relaxed mt-3" style={{ color: body }}>
              德国跨境合规一站式服务
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: heading }}>服务项目</p>
            <Link to="/packaging" className="block py-1 text-sm transition-colors" style={{ color: body }}>包装法 AR</Link>
            <Link to="/weee" className="block py-1 text-sm transition-colors" style={{ color: body }}>WEEE</Link>
            <Link to="/battery" className="block py-1 text-sm transition-colors" style={{ color: body }}>电池法</Link>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: heading }}>快速链接</p>
            <Link to="/calculator" className="block py-1 text-sm transition-colors" style={{ color: body }}>费用计算器</Link>
            <Link to="/faq" className="block py-1 text-sm transition-colors" style={{ color: body }}>常见问题</Link>
            <Link to="/downloads" className="block py-1 text-sm transition-colors" style={{ color: body }}>下载中心</Link>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: heading }}>授权代表</p>
            <p className="block py-1 text-sm" style={{ color: body }}>LIVANTO GmbH (包装法)</p>
            <p className="block py-1 text-sm" style={{ color: body }}>WEEE Return GmbH</p>
            <p className="block py-1 text-sm" style={{ color: body }}>Stiftung EAR</p>
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs" style={{ borderTop: `1px solid ${border}`, color: '#5a6d82' }}>
          <span>© {new Date().getFullYear()} FREDDY 福瑞笛 — 德国跨境合规 本土授权代表</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" style={{ color: '#5a6d82' }}>皖ICP备2025099866号-1</a>
        </div>
      </div>
    </footer>
  )
}
