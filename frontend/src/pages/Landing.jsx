import { Link } from 'react-router-dom'
import { AR_TIERS, BATTERY_STARTING_PRICE, WEEE_STARTING_PRICE } from '@shared/constants.js'

const services = [
  {
    to: '/packaging',
    title: '德国包装法授权代表',
    titleDe: 'VerpackG §35(2)',
    price: `€${AR_TIERS.basic.feeEur}`,
    period: '/ 年',
    tag: '2026.8.12 强制生效',
    desc: 'LIVANTO GmbH 担任授权代表，承担双元系统对接、LUCID数据申报、完整性声明、运输包装回收组织及官方通信等全部法定义务。',
    stats: [
      { label: '年费起步', value: '€89' },
      { label: '签约耗时', value: '≈5分钟' },
      { label: '合规生效', value: '付款后次月' },
    ],
    accent: 'navy',
  },
  {
    to: '/battery',
    title: '德国电池法 BattG',
    titleDe: 'Batteriegesetz',
    price: `€${BATTERY_STARTING_PRICE}`,
    period: '/ 年起',
    desc: 'WEEE Return GmbH 担任授权代表，负责 EAR 注册、回收处置方案、年度申报及与德国联邦环境局 (UBA) 的全部官方沟通。',
    stats: [
      { label: '年费起步', value: `€${BATTERY_STARTING_PRICE}` },
      { label: '品牌数量', value: '不限' },
      { label: '含 EAR 注册', value: '首年' },
    ],
    accent: 'gold',
  },
  {
    to: '/weee',
    title: '德国 WEEE 电子电气法',
    titleDe: 'Elektrogesetz (ElektroG)',
    price: `€${WEEE_STARTING_PRICE}`,
    period: '/ 年起',
    tag: '6大类别全覆盖',
    desc: 'WEEE Return GmbH 担任授权代表，覆盖全部6个设备类别，承担 EAR 注册、 insolvency 担保确认、回收处理及年度数据申报全流程。',
    stats: [
      { label: '年费起步', value: `€${WEEE_STARTING_PRICE}` },
      { label: '设备类别', value: '1-6类' },
      { label: '含担保', value: '首年' },
    ],
    accent: 'navy',
  },
]

const steps = [
  {
    num: '01',
    title: '选择合规产品',
    desc: '根据您的产品类型，选择对应的德国合规服务：包装法、WEEE 电子电气法、电池法 BattG。不确定选哪个？使用费用计算器快速判断。',
  },
  {
    num: '02',
    title: '在线填写信息',
    desc: '提交公司基本信息和产品数据。全中文引导界面，字段说明清晰。所有信息严格对应德国官方合同模板的必填项。',
  },
  {
    num: '03',
    title: '签署授权代表合同',
    desc: '系统根据您填写的信息自动生成授权代表合同。下载打印，签字盖章后上传扫描件。管理员盖章回传，合同签订完成。',
  },
  {
    num: '04',
    title: '授权代表接管合规',
    desc: '合同生效后，德国授权代表开始履行法定职责——LUCID/EAR 注册确认、双元系统对接、年度数据申报、官方通信处理。您只需每年更新数据。',
  },
]

export default function Landing() {
  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #f8f9fb 0%, #fff 100%)' }}>
        {/* Subtle geometric accent */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.03]"
          style={{
            background: `radial-gradient(circle at 70% 30%, #1e3a5f, transparent 70%),
                         repeating-linear-gradient(45deg, #1e3a5f 0px, #1e3a5f 1px, transparent 1px, transparent 20px)` }}>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-20 pb-24 md:pt-28 md:pb-32 relative">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6 animate-fade-up">
              <span className="w-8 h-px" style={{ background: '#c8a44e' }}></span>
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#c8a44e' }}>
                FREDDY · 福瑞笛
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 animate-fade-up"
              style={{ color: '#0a1628', letterSpacing: '-0.03em' }}>
              德国跨境合规
              <br />
              <span style={{ color: '#1e3a5f' }}>一站式解决方案</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg leading-relaxed mb-10 max-w-xl animate-fade-up"
              style={{ color: '#5a6d82' }}>
              包装法 · WEEE 电子电气法 · 电池法 BattG<br />
              德国本土授权代表全程护航，从签约到申报全闭环，PPWR 2025/40 合规就绪。
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 animate-fade-up">
              <Link to="/signup" className="btn-primary">
                立即签约
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <Link to="/faq" className="btn-outline">
                了解更多
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6 mt-12 pt-8 animate-fade-up"
              style={{ borderTop: '1px solid #e2e6ed' }}>
              {[
                { label: '德国本土授权代表', sub: 'LIVANTO GmbH / WEEE Return GmbH' },
                { label: '合同法律效力', sub: '德文版本 · 德国法律管辖' },
                { label: '官方机构对接', sub: 'ZSVR · Stiftung EAR · UBA' },
              ].map((t, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold" style={{ color: '#0a1628' }}>{t.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8b9aab' }}>{t.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4-Step Process ── */}
      <section style={{ background: '#fff' }}>
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          {/* Section header */}
          <div className="mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase mb-3 block" style={{ color: '#c8a44e' }}>
              四步完成合规
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: '#0a1628', letterSpacing: '-0.02em' }}>
              授权代表全程护航
            </h2>
          </div>

          {/* Steps — asymmetric grid */}
          <div className="grid md:grid-cols-2 gap-0">
            {steps.map((s, i) => (
              <div key={i}
                className={`relative pt-10 pb-10 md:pr-12 ${i % 2 === 1 ? 'md:pl-12 md:pr-0 md:border-l' : ''}`}
                style={{ borderColor: i % 2 === 1 ? '#e2e6ed' : 'transparent' }}>
                {/* Step number */}
                <p className="text-7xl font-extrabold mb-4 tracking-tight"
                  style={{ color: i % 2 === 0 ? '#1e3a5f' : '#c8a44e', opacity: 0.15, lineHeight: 1 }}>
                  {s.num}
                </p>
                <h3 className="text-xl font-bold mb-3" style={{ color: '#0a1628' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed max-w-md" style={{ color: '#5a6d82' }}>{s.desc}</p>

                {/* Connector dot */}
                <div className="absolute top-14 left-0 w-2 h-2 rounded-full hidden md:block"
                  style={{ background: i % 2 === 0 ? '#1e3a5f' : '#c8a44e',
                           marginLeft: i % 2 === 1 ? -5 : 'auto', right: i % 2 === 0 ? -4 : 'auto' }}>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Cards ── */}
      <section style={{ background: '#f8f9fb' }}>
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase mb-3 block" style={{ color: '#c8a44e' }}>
              合规服务
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: '#0a1628', letterSpacing: '-0.02em' }}>
              选择您需要的服务
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <Link key={s.to} to={s.to} className="card-white group flex flex-col overflow-hidden">
                {/* Card header with accent */}
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs tracking-wider uppercase" style={{ color: '#8b9aab' }}>
                      {s.titleDe}
                    </p>
                    {s.tag && (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                        style={{ background: s.accent === 'gold' ? '#faf3e0' : '#eef1f5',
                                 color: s.accent === 'gold' ? '#c8a44e' : '#1e3a5f' }}>
                        {s.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-1" style={{ color: '#0a1628' }}>{s.title}</h3>
                </div>

                {/* Price */}
                <div className="px-6 pb-5">
                  <span className="text-4xl font-extrabold tracking-tight" style={{ color: '#1e3a5f' }}>{s.price}</span>
                  <span className="text-sm ml-1" style={{ color: '#8b9aab' }}>{s.period}</span>
                </div>

                {/* Stats row */}
                <div className="px-6 pb-5">
                  <div className="flex gap-4 py-3"
                    style={{ borderTop: '1px solid #eef1f5', borderBottom: '1px solid #eef1f5' }}>
                    {s.stats.map((st, j) => (
                      <div key={j} className="flex-1">
                        <p className="text-lg font-bold" style={{ color: '#0d1b2a' }}>{st.value}</p>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: '#8b9aab' }}>{st.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description + CTA */}
                <div className="px-6 pb-6 flex-1 flex flex-col">
                  <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: '#5a6d82' }}>{s.desc}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all"
                    style={{ color: s.accent === 'gold' ? '#c8a44e' : '#1e3a5f' }}>
                    了解详情
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative overflow-hidden" style={{ background: '#0a1628' }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px)`, backgroundSize: '40px 40px' }}>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-20 md:py-24 text-center relative">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4" style={{ color: '#fff' }}>
            准备开始德国合规？
          </h2>
          <p className="text-sm md:text-base mb-8 max-w-lg mx-auto" style={{ color: '#8b9aab' }}>
            在线填写信息，约5分钟完成签约。德国授权代表接管后续全部合规工作。
          </p>
          <Link to="/signup" className="btn-gold">
            立即免费签约
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
