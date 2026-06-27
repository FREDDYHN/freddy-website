import { Link } from 'react-router-dom'
import { AR_TIERS, BATTERY_STARTING_PRICE, WEEE_STARTING_PRICE } from '@shared/constants.js'

const services = [
  { to: '/packaging', title: '包装法授权代表', titleDe: 'VerpackG §35(2)', price: `€${AR_TIERS.basic.feeEur}`, period: '/年', tag: '2026强制', desc: 'LIVANTO GmbH 担任授权代表，承担双元系统对接、LUCID数据申报、完整性声明、运输包装回收及官方通信等全部法定义务。', accent: 'navy' },
  { to: '/battery', title: '德国电池法 BattG', titleDe: 'Batteriegesetz', price: `€${BATTERY_STARTING_PRICE}`, period: '/年起', desc: 'WEEE Return GmbH 担任授权代表，负责 EAR 注册、回收处置方案、年度申报及与德国联邦环境局 (UBA) 的全部官方沟通。', accent: 'gold' },
  { to: '/weee', title: '德国 WEEE 电子电气法', titleDe: 'Elektrogesetz (ElektroG)', price: `€${WEEE_STARTING_PRICE}`, period: '/年起', tag: '6大类别全覆盖', desc: 'WEEE Return GmbH 担任授权代表，覆盖全部6个设备类别，承担 EAR 注册、 insolvency 担保确认、回收处理及年度数据申报全流程。', accent: 'navy' },
]

const steps = [
  { num: '01', title: '选择合规产品', desc: '根据您的产品类型，选择对应的德国合规服务：包装法、WEEE 电子电气法、电池法 BattG。' },
  { num: '02', title: '在线填写信息', desc: '提交公司基本信息和产品数据。全中文引导，字段严格对应德国官方合同模板。' },
  { num: '03', title: '签署合同并支付', desc: '系统生成授权代表合同，下载打印签字盖章后上传。收到账单，银行转账付款后合同生效。' },
]

export default function Landing() {
  return (
    <div>
      {/* ── Hero ── */}
      <section className="hero-gradient text-white py-16 md:py-20 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold mb-3">德国跨境合规 · 一站式解决方案</h1>
        <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto mb-8">
          包装法 · WEEE 电子电气法 · 电池法 BattG — 德国本土授权代表全程护航
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/signup" className="btn-primary" style={{ background: '#fff', color: '#1a3a5c' }}>
            立即签约 →
          </Link>
          <Link to="/faq" className="btn-outline" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>
            了解更多
          </Link>
        </div>
        {/* Trust bar */}
        <div className="flex flex-wrap justify-center gap-6 mt-10 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          {['德国本土授权代表', '德国法律管辖', '官方机构对接'].map((t, i) => (
            <span key={i} className="text-xs text-gray-400">{t}</span>
          ))}
        </div>
      </section>

      {/* ── 3-Step Process ── */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-primary">四步完成合规，授权代表全程护航</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mx-auto mb-4">{s.num}</div>
                <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Cards ── */}
      <section className="bg-bg py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {services.map(s => (
              <Link key={s.to} to={s.to} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden group flex flex-col">
                {/* Header */}
                <div className="bg-primary p-4 text-white">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{s.title}</h3>
                    {s.tag && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{s.tag}</span>}
                  </div>
                  <p className="text-2xl font-bold mt-2">{s.price}<span className="text-sm text-white/60 ml-1">{s.period}</span></p>
                </div>
                {/* Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-xs text-gray-400 mb-1">授权代表职责</p>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="hero-gradient text-white py-16 px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">准备开始德国合规？</h2>
        <p className="text-sm text-gray-300 mb-6 max-w-md mx-auto">
          在线填写信息，约5分钟完成签约。德国授权代表接管后续全部合规工作。
        </p>
        <Link to="/signup" className="btn-primary" style={{ background: '#fff', color: '#1a3a5c' }}>
          立即免费签约 →
        </Link>
      </section>
    </div>
  )
}
