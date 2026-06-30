import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-primary text-white/50 py-6 px-5 text-center text-xs space-y-2">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
        <span>📞 +86 152 2138 0610</span>
        <span>✉️ info@freddy-epr.com</span>
      </div>
      <p>© {new Date().getFullYear()} 福瑞笛（上海）信息咨询有限公司淮南分公司 版权所有</p>
      <p>
        <Link to="/about" className="hover:text-white/80">关于我们</Link>
        &nbsp;|&nbsp;
        <Link to="/contact" className="hover:text-white/80">联系我们</Link>
        &nbsp;|&nbsp;
        <Link to="/privacy" className="hover:text-white/80">隐私政策</Link>
        &nbsp;|&nbsp;
        <Link to="/terms" className="hover:text-white/80">用户服务协议</Link>
        &nbsp;|&nbsp;
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-white/80">皖ICP备2025099866号-1</a>
      </p>
    </footer>
  )
}
