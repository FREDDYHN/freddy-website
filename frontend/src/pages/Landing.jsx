import { Link } from 'react-router-dom'
import { AR_TIERS, BATTERY_STARTING_PRICE, WEEE_STARTING_PRICE } from '@shared/constants.js'

const cards = [
  { to: '/packaging', title: '包装法授权代表', tag: '2026 强制', price: `€${AR_TIERS.basic.feeEur}`, period: '/ 年', desc: 'LIVANTO GmbH 担任授权代表，承担双元系统对接、LUCID 数据申报、完整性声明及官方通信等全部法定义务。' },
  { to: '/battery',   title: '德国电池法 BattG',                    price: `€${BATTERY_STARTING_PRICE}`, period: '/ 年起', desc: 'WEEE Return GmbH 担任授权代表，负责 EAR 注册、回收处置方案、年度申报及与 UBA 的全部官方沟通。' },
  { to: '/weee',      title: '德国 WEEE 电子电气法', tag: '6 大类别', price: `€${WEEE_STARTING_PRICE}`, period: '/ 年起', desc: 'WEEE Return GmbH 担任授权代表，覆盖全部 6 个设备类别，承担 EAR 注册、担保确认及年度数据申报全流程。' },
]

export default function Landing() {
  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #4a5d50 0%, #5f7565 50%, #4a5d50 100%)' }}>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-10 tracking-tight">德国跨境合规 · 一站式解决方案</h1>
        {/* Flow diagram — 线贯穿标签 */}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center">
            {['选择产品','信息填写','合同签订','授权代表全面接手'].map((label, i) => (
              <div key={i} className="flex items-center" style={{flex:1}}>
                <span className="text-xs md:text-sm text-white/80 font-medium px-4 py-1.5 rounded-full" style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>{label}</span>
                {i < 3 && <div className="h-px" style={{flex:1, background:'rgba(255,255,255,0.12)', minWidth:12}}></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-4" style={{background:'#f4f2ef'}}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
          {cards.map(c => (
            <Link key={c.to} to={c.to} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="bg-primary text-white p-5 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-base">{c.title}</h3>
                  {c.tag && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20">{c.tag}</span>}
                </div>
                <p className="text-2xl font-extrabold" style={{ color: '#c8a44e' }}>{c.price}<span className="text-sm font-normal text-white/50 ml-0.5">{c.period}</span></p>
              </div>
              <div className="p-4 flex-1">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">授权代表职责</p>
                <p className="text-[13px] text-gray-500 leading-relaxed">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-10 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center mb-8">
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">为什么选择福瑞笛</h2>
          <p className="text-gray-400 text-sm">德中双实体 · 全流程中文服务 · 价格透明</p>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-5 text-center">
          {[
            { n: '德国', d: '本土授权代表' },
            { n: '中文', d: '全流程服务' },
            { n: '0', d: '隐藏费用' },
            { n: '3+', d: '年行业经验' },
          ].map((s, i) => (
            <div key={i} className="p-5">
              <p className="text-3xl font-extrabold text-primary mb-1">{s.n}</p>
              <p className="text-xs text-gray-400">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-4" style={{background:'#f4f2ef'}}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-gray-800 mb-3">开始您的德国合规之旅</h2>
          <p className="text-gray-400 text-sm mb-6">3 分钟完成签约，LIVANTO 授权代表即日生效</p>
          <Link to="/signup/packaging?tier=basic" className="inline-block px-8 py-3 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors">立即签约 — €89/年起</Link>
        </div>
      </section>
    </div>
  )
}
