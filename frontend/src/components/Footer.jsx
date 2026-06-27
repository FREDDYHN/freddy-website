import { Link } from 'react-router-dom'

const footerBg = '#1c2a3a'
const headingColor = '#e2e8f0'
const bodyColor = '#94a3b8'
const bottomColor = '#64748b'
const borderColor = '#2a3b50'

export default function Footer() {
  return (
    <footer style={{ background: footerBg, borderTop: `1px solid ${borderColor}` }}>
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-bold mb-3" style={{ color: headingColor }}>福瑞笛 FREDDY</h4>
          <p className="text-xs leading-relaxed" style={{ color: bodyColor }}>
            德国跨境合规一站式服务<br />包装法授权代表 | WEEE | 电池法
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-3" style={{ color: headingColor }}>服务项目</h4>
          <Link to="/packaging" className="block py-1 transition-colors" style={{ color: bodyColor }}
            onMouseEnter={e => e.target.style.color = headingColor}
            onMouseLeave={e => e.target.style.color = bodyColor}>包装法 AR</Link>
          <Link to="/weee" className="block py-1 transition-colors" style={{ color: bodyColor }}
            onMouseEnter={e => e.target.style.color = headingColor}
            onMouseLeave={e => e.target.style.color = bodyColor}>WEEE</Link>
          <Link to="/battery" className="block py-1 transition-colors" style={{ color: bodyColor }}
            onMouseEnter={e => e.target.style.color = headingColor}
            onMouseLeave={e => e.target.style.color = bodyColor}>电池法</Link>
        </div>
        <div>
          <h4 className="font-bold mb-3" style={{ color: headingColor }}>快速链接</h4>
          <Link to="/calculator" className="block py-1 transition-colors" style={{ color: bodyColor }}
            onMouseEnter={e => e.target.style.color = headingColor}
            onMouseLeave={e => e.target.style.color = bodyColor}>费用计算器</Link>
          <Link to="/faq" className="block py-1 transition-colors" style={{ color: bodyColor }}
            onMouseEnter={e => e.target.style.color = headingColor}
            onMouseLeave={e => e.target.style.color = bodyColor}>常见问题</Link>
          <Link to="/downloads" className="block py-1 transition-colors" style={{ color: bodyColor }}
            onMouseEnter={e => e.target.style.color = headingColor}
            onMouseLeave={e => e.target.style.color = bodyColor}>下载中心</Link>
        </div>
        <div>
          <h4 className="font-bold mb-3" style={{ color: headingColor }}>合作伙伴</h4>
          <span className="block py-1" style={{ color: bodyColor }}>LIVANTO GmbH (AR)</span>
          <span className="block py-1" style={{ color: bodyColor }}>WEEE Return GmbH</span>
          <span className="block py-1" style={{ color: bodyColor }}>Stiftung EAR</span>
        </div>
      </div>
      <div className="py-4 text-center text-xs space-y-1" style={{ borderTop: `1px solid rgba(148,163,184,0.12)`, color: bottomColor }}>
        <div>
          © {new Date().getFullYear()} FREDDY 福瑞笛 — 德国跨境合规 本土授权代表 | <Link to="/downloads" style={{ color: bottomColor }}>法律文件</Link>
        </div>
        <div>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" style={{ color: bottomColor }}>皖ICP备2025099866号-1</a>
        </div>
      </div>
    </footer>
  )
}
