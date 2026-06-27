import { Link } from 'react-router-dom'
import { AR_TIERS, BATTERY_STARTING_PRICE, WEEE_STARTING_PRICE } from '@shared/constants.js'

const services = [
  {
    to: '/packaging', title: '包装法授权代表', price: `€${AR_TIERS.basic.feeEur}/年`, priceLabel: '年费',
    desc: 'LIVANTO GmbH 作为您在德国的授权代表，承担双元系统对接、LUCID数据申报、完整性声明、运输包装回收及官方通信等全部法定义务。',
    accent: 'border-cyan/25', tag: '2026强制',
  },
  {
    to: '/battery', title: '德国电池法 BattG', price: `€${BATTERY_STARTING_PRICE}/年起`, priceLabel: '年起',
    desc: 'WEEE Return GmbH 作为授权代表，负责 EAR 注册、回收处置方案、年度申报及与德国联邦环境局（UBA）的全部官方沟通。',
    accent: 'border-orange/25',
  },
  {
    to: '/weee', title: '德国 WEEE 电子电气法', price: `€${WEEE_STARTING_PRICE}/年起`, priceLabel: '年起',
    desc: 'WEEE Return GmbH 作为授权代表，覆盖6大设备类别，承担 EAR 注册、担保确认、回收处理及年度数据申报全流程。',
    accent: 'border-green/25',
  },
]

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="py-24 md:py-32 px-4 text-center" style={{ background: 'var(--color-bg-dark)' }}>
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(0,180,216,0.12)', color: '#00b4d8' }}>
            PPWR 2025/40 · 2026年8月12日强制生效
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: '#e2e8f0' }}>
            德国跨境合规 · 一站式解决方案
          </h1>
          <p className="text-base md:text-lg mb-8" style={{ color: '#8899aa', maxWidth: 600, margin: '0 auto' }}>
            包装法 · WEEE电子电气法 · 电池法 — 授权代表全程护航，从签约到申报全闭环
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:-translate-y-0.5"
              style={{ background: '#00b4d8', color: '#fff', boxShadow: '0 4px 20px rgba(0,180,216,0.25)' }}>
              立即签约 →
            </Link>
            <Link to="/faq" className="px-6 py-3 rounded-lg font-semibold text-sm transition-all"
              style={{ border: '1px solid rgba(0,180,216,0.5)', color: '#00b4d8', background: 'transparent' }}>
              了解更多
            </Link>
          </div>
        </div>
      </section>

      {/* Progress Flow */}
      <section className="py-20 px-4" style={{ background: 'var(--color-bg-light)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-16" style={{ color: '#e2e8f0' }}>
            四步完成合规，授权代表全程护航
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { step: '01', icon: '📦', title: '选择产品', desc: '确定需要合规的产品类型：包装法、WEEE电子电气法、电池法 BattG' },
              { step: '02', icon: '📝', title: '填写信息', desc: '在线提交公司及商品信息，全程中文引导，约5分钟完成' },
              { step: '03', icon: '📄', title: '签订合同', desc: '系统生成授权代表合同，下载打印签字盖章，上传即完成签署' },
              { step: '04', icon: '🤝', title: '授权代表接手', desc: '授权代表接管LUCID/EAR注册、双元系统对接、年度申报等全部合规工作' },
            ].map((s, i) => (
              <div key={i} className="relative text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4 relative z-10"
                  style={{ background: '#00b4d8', color: '#fff' }}>
                  {s.step}
                </div>
                <div className="text-3xl mb-2">{s.icon}</div>
                <h3 className="font-bold mb-2" style={{ color: '#e2e8f0' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8899aa' }}>{s.desc}</p>
              </div>
            ))}
          </div>
          {/* Connector line */}
          <div className="hidden md:block relative -mt-24 mb-0">
            <div className="absolute top-0 left-[12.5%] right-[12.5%] h-0.5" style={{ background: '#2a3b50' }}></div>
          </div>
        </div>
      </section>

      {/* Service Cards */}
      <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {services.map(s => (
            <Link key={s.to} to={s.to}
              className={`block bg-card border rounded-card p-0 overflow-hidden transition-all hover:-translate-y-1 ${s.accent}`}
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
              {/* Price header */}
              <div className="p-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg" style={{ color: '#e2e8f0' }}>{s.title}</h3>
                  {s.tag && <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(0,180,216,0.15)', color: '#00b4d8' }}>{s.tag}</span>}
                </div>
                <p className="text-3xl font-extrabold" style={{ color: '#00b4d8' }}>{s.price}</p>
                <p className="text-xs mt-0.5" style={{ color: '#556677' }}>{s.priceLabel}</p>
              </div>
              {/* AR work scope */}
              <div className="p-5">
                <p className="text-xs mb-1" style={{ color: '#556677' }}>授权代表职责</p>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
