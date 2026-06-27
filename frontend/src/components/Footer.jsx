import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-primary text-white/60 py-6 px-5 text-center text-xs leading-relaxed">
      <p>© {new Date().getFullYear()} FREDDY 福瑞笛 — 德国跨境合规 本土授权代表 &nbsp;|&nbsp; LIVANTO GmbH · WEEE Return GmbH</p>
      <p>
        <Link to="/downloads" className="text-white/60 hover:text-white/90">法律文件</Link>
        &nbsp;|&nbsp;
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white/90">皖ICP备2025099866号-1</a>
      </p>
    </footer>
  )
}
