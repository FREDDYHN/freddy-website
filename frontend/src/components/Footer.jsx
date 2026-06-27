export default function Footer() {
  return (
    <footer className="bg-primary text-white/50 py-5 px-5 text-center text-xs space-y-1">
      <p>© {new Date().getFullYear()} FREDDY 福瑞笛 — 德国跨境合规 本土授权代表 &nbsp;|&nbsp; LIVANTO GmbH · WEEE Return GmbH</p>
      <p><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-white/80">皖ICP备2025099866号-1</a></p>
    </footer>
  )
}
