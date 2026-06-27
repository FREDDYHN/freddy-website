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
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #3d5a48 0%, #527a60 50%, #3d5a48 100%)' }}>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">德国跨境合规 · 一站式解决方案</h1>
        <p className="text-sm md:text-base max-w-xl mx-auto text-white/70 mb-10">选择产品，信息填写，合同签订，授权代表全面接手</p>
        {/* Flow diagram */}
        <div className="flex items-center justify-center gap-2 md:gap-4 max-w-2xl mx-auto">
          {[
            { icon:'📦', label:'选择产品' },
            { icon:'📝', label:'信息填写' },
            { icon:'📄', label:'合同签订' },
            { icon:'🤝', label:'授权代表全面接手' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 md:gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xl md:text-2xl">{step.icon}</span>
                <div className="w-2 h-2 rounded-full bg-white/60"></div>
                <span className="text-xs md:text-sm text-white/80 font-medium whitespace-nowrap">{step.label}</span>
              </div>
              {i < 3 && <span className="text-white/30 text-lg mb-6">→</span>}
            </div>
          ))}
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
    </div>
  )
}
