import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-primary-dark text-gray-300 text-sm">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h4 className="text-white font-bold mb-3">福瑞笛 FREDDY</h4>
          <p className="text-xs leading-relaxed">德国跨境合规一站式服务<br />包装法授权代表 | WEEE | 电池法</p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3">服务项目</h4>
          <Link to="/packaging" className="block py-1 hover:text-white">包装法 AR</Link>
          <Link to="/weee" className="block py-1 hover:text-white">WEEE</Link>
          <Link to="/battery" className="block py-1 hover:text-white">电池法</Link>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3">快速链接</h4>
          <Link to="/calculator" className="block py-1 hover:text-white">费用计算器</Link>
          <Link to="/faq" className="block py-1 hover:text-white">常见问题</Link>
          <Link to="/downloads" className="block py-1 hover:text-white">下载中心</Link>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3">合作伙伴</h4>
          <span className="block py-1">LIVANTO GmbH (AR)</span>
          <span className="block py-1">WEEE Return GmbH</span>
          <span className="block py-1">Stiftung EAR</span>
        </div>
      </div>
      <div className="border-t border-gray-700 py-4 text-center text-xs text-gray-500 space-y-1">
        <div>
          © {new Date().getFullYear()} FREDDY 福瑞笛 — 德国跨境合规 本土授权代表 | <Link to="/downloads" className="hover:text-gray-300">法律文件</Link>
        </div>
        <div>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">皖ICP备2025099866号-1</a>
        </div>
      </div>
    </footer>
  )
}
